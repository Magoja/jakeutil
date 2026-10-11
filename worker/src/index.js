// jakeutil-api Worker (hello world)
// -------------------------------
// Served by Cloudflare Workers. In production this answers
// https://jakeutil.com/api/* (see ../wrangler.toml routes).
//
// The browser never touches KV, D1, or any secret directly — it only
// calls these HTTP endpoints, and the Worker is the only thing with
// the bindings.

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*", // hello endpoint is public; tighten per-endpoint later
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function handleHello(url) {
  // Keep it to printable ASCII, max 64 chars — never trust query input.
  const raw = url.searchParams.get("name") || "world";
  const name = raw.replace(/[^\x20-\x7E]/g, "").slice(0, 64) || "world";
  return json({
    message: `Hello, ${name}!`,
    from: "Cloudflare Worker",
    time: new Date().toISOString(),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    if (url.pathname === "/api/hello" && request.method === "GET") {
      return handleHello(url);
    }

    return json(
      { error: "not found", hint: "Try GET /api/hello?name=Jake" },
      404
    );
  },
};
