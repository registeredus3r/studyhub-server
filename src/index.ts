// Worker backend code with CORS support
export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // GET /sets
    if (request.method === "GET" && url.pathname === "/sets") {
      const { results } = await env.DB.prepare("SELECT id, title, description FROM sets").all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // GET /sets/:id/cards
    const match = url.pathname.match(/^\/sets\/([^/]+)\/cards$/);
    if (request.method === "GET" && match) {
      const setId = match[1];
      const { results } = await env.DB.prepare("SELECT id, front, back FROM cards WHERE set_id = ?")
        .bind(setId)
        .all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // POST /sets
    if (request.method === "POST" && url.pathname === "/sets") {
      const body = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO sets (id, title, description) VALUES (?, ?, ?)")
        .bind(id, body.title, body.description || "")
        .run();
      return new Response(JSON.stringify({ id, ...body }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // POST /sets/:id/cards
    if (request.method === "POST" && match) {
      const setId = match[1];
      const body = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO cards (id, set_id, front, back) VALUES (?, ?, ?, ?)")
        .bind(id, setId, body.front, body.back)
        .run();
      return new Response(JSON.stringify({ id, set_id: setId, ...body }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
