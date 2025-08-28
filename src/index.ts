export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    // GET /sets
    if (request.method === "GET" && url.pathname === "/sets") {
      const { results } = await env.DB.prepare("SELECT id, title, description FROM sets").all();
      return Response.json(results);
    }

    // GET /sets/:id/cards
    const match = url.pathname.match(/^\/sets\/([^/]+)\/cards$/);
    if (request.method === "GET" && match) {
      const setId = match[1];
      const { results } = await env.DB.prepare("SELECT id, front, back FROM cards WHERE set_id = ?")
        .bind(setId)
        .all();
      return Response.json(results);
    }

    // POST /sets
    if (request.method === "POST" && url.pathname === "/sets") {
      const body = await request.json();
      const id = crypto.randomUUID();

      await env.DB.prepare("INSERT INTO sets (id, title, description) VALUES (?, ?, ?)")
        .bind(id, body.title, body.description || "")
        .run();

      return Response.json({ id, ...body });
    }

    // POST /sets/:id/cards
    if (request.method === "POST" && match) {
      const setId = match[1];
      const body = await request.json();
      const id = crypto.randomUUID();

      await env.DB.prepare("INSERT INTO cards (id, set_id, front, back) VALUES (?, ?, ?, ?)")
        .bind(id, setId, body.front, body.back)
        .run();

      return Response.json({ id, set_id: setId, ...body });
    }

    return new Response("Not Found", { status: 404 });
  }
};
