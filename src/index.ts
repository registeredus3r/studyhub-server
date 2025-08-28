export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    // List sets
    if (url.pathname === "/sets") {
      const { results } = await env.DB.prepare("SELECT id, title, description FROM sets").all();
      return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
    }

    // Get cards for a set
    const match = url.pathname.match(/^\/sets\/([^/]+)\/cards$/);
    if (match) {
      const setId = match[1];
      const { results } = await env.DB.prepare("SELECT id, front, back FROM cards WHERE set_id = ?").bind(setId).all();
      return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not Found", { status: 404 });
  }
};