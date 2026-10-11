# jakeutil-api Worker

Hello-world API backend for jakeutil.com, running on Cloudflare Workers.

## Try it locally (no Cloudflare account needed)

`wrangler dev` runs the Worker on your own machine using the real
Workers runtime — no login, no deployment, nothing leaves your computer.

```
npm i -g wrangler      # once
cd worker
wrangler dev --port 8787
```

Then in another terminal, serve the repo root so the test page loads:

```
cd /path/to/jakeutil
npx serve .            # or: python3 -m http.server 8000
```

Open `http://localhost:3000/api-test.html` (or whichever port `serve`
prints), paste `http://localhost:8787` into the **API base URL** field,
and hit **Call API**. The page calls your locally-running Worker.

Stop the Worker with Ctrl-C.

## Deploy (when ready)

1. Log in and deploy:
   ```
   wrangler login
   wrangler deploy
   ```
   This gives you a `*.workers.dev` URL you can test immediately —
   paste it into the test page's API base field.
2. Attach it to the domain: in `wrangler.toml`, uncomment the `[[routes]]`
   block, then `wrangler deploy` again. The Worker will answer
   `https://jakeutil.com/api/*`; everything else keeps serving from
   GitHub Pages. After the route is live, the test page works with the
   API base field left empty.

## Endpoints

- `GET /api/hello` → `{ message, from, time }`
- `GET /api/hello?name=Jake` → personalized greeting (sanitized, max 64 chars)
