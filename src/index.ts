// Updated Worker backend with user logic + known/unknown + starred
export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-ID",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Extract user ID (or assign one if missing)
    let userId = request.headers.get("X-User-ID");
    if (!userId) {
      userId = crypto.randomUUID();
    }

    // Ensure tables exist (D1 migrations are better, but inline for dev)
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        set_id TEXT NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        FOREIGN KEY(set_id) REFERENCES sets(id)
      );
      CREATE TABLE IF NOT EXISTS progress (
        user_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        known INTEGER DEFAULT 0,
        starred INTEGER DEFAULT 0,
        PRIMARY KEY(user_id, card_id),
        FOREIGN KEY(card_id) REFERENCES cards(id)
      );
    `);

    // GET /sets
    if (request.method === "GET" && url.pathname === "/sets") {
      const { results } = await env.DB.prepare("SELECT id, title, description FROM sets").all();
      return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json", ...corsHeaders, "X-User-ID": userId } });
    }

    // POST /sets
    if (request.method === "POST" && url.pathname === "/sets") {
      const body = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO sets (id, title, description) VALUES (?, ?, ?)").bind(id, body.title, body.description || "").run();
      return new Response(JSON.stringify({ id, ...body }), { headers: { "Content-Type": "application/json", ...corsHeaders, "X-User-ID": userId } });
    }

    // GET /sets/:id/cards
    const cardsMatch = url.pathname.match(/^\/sets\/([^/]+)\/cards$/);
    if (request.method === "GET" && cardsMatch) {
      const setId = cardsMatch[1];
      const { results } = await env.DB.prepare(`
        SELECT c.id, c.front, c.back, p.known, p.starred
        FROM cards c
        LEFT JOIN progress p ON p.card_id = c.id AND p.user_id = ?
        WHERE c.set_id = ?
      `).bind(userId, setId).all();
      return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json", ...corsHeaders, "X-User-ID": userId } });
    }

    // POST /sets/:id/cards
    if (request.method === "POST" && cardsMatch) {
      const setId = cardsMatch[1];
      const body = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO cards (id, set_id, front, back) VALUES (?, ?, ?, ?)").bind(id, setId, body.front, body.back).run();
      return new Response(JSON.stringify({ id, set_id: setId, ...body }), { headers: { "Content-Type": "application/json", ...corsHeaders, "X-User-ID": userId } });
    }

    // PATCH /cards/:id/progress
    const progressMatch = url.pathname.match(/^\/cards\/([^/]+)\/progress$/);
    if (request.method === "PATCH" && progressMatch) {
      const cardId = progressMatch[1];
      const body = await request.json();
      const known = body.known ? 1 : 0;
      const starred = body.starred ? 1 : 0;
      await env.DB.prepare(`
        INSERT INTO progress (user_id, card_id, known, starred)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, card_id) DO UPDATE SET known = excluded.known, starred = excluded.starred
      `).bind(userId, cardId, known, starred).run();
      return new Response(JSON.stringify({ card_id: cardId, known, starred }), { headers: { "Content-Type": "application/json", ...corsHeaders, "X-User-ID": userId } });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
