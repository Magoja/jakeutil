# jakeutil-api Worker

Hello-world API backend for jakeutil.com, running on Cloudflare Workers.

## Deploy (one time)

1. Install wrangler and log in:
   ```
   npm i -g wrangler
   wrangler login
   ```
2. From this directory:
   ```
   wrangler deploy
   ```
   This gives you a `*.workers.dev` URL you can test immediately.
3. Attach it to the domain: in `wrangler.toml`, uncomment the `[[routes]]`
   block, then `wrangler deploy` again. The Worker will answer
   `https://jakeutil.com/api/*`; everything else keeps serving from
   GitHub Pages.

## Test

Open `https://jakeutil.com/api-test.html` (or the PR preview equivalent),
leave the API base empty (same origin), and hit **Call API**.
Before the route is attached, paste the `*.workers.dev` URL from step 2
into the API base field instead.

## Endpoints

- `GET /api/hello` → `{ message, from, time }`
- `GET /api/hello?name=Jake` → personalized greeting (sanitized, max 64 chars)
