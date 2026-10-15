# Live shopping search

Open **ค้นสินค้าจริง · Shopping** on home, enter a product and budget, then search.
Voice/text examples: `หาหูฟัง งบ 1500`, `ค้นสินค้า เครื่องชงกาแฟ`, `compare prices headphones`.
The results are web source cards, not a live stock or price feed. Follow the source link
and verify price, shipping and availability at the store. This mode cannot check out or pay.
The existing sample email → grocery basket → payment-approval storyboard is unchanged.

## Configuration

Search uses the existing server-side Tavily REST integration. Set either:

- `TAVILY_KEYLESS=true` for rate-limited keyless Search, or
- `TAVILY_API_KEY` through the existing secret environment for keyed usage.

The key takes precedence when both are set. CLI OAuth credentials are not copied into
the app, exposed to the browser, or required by keyless Search. Restart the Node server
after changing its environment. Hosted deployments need the same environment setting.
Run `npm run agent:sync` in `web/` against the intended ElevenLabs agent to update the
tool descriptions and prompt; search readiness is shared with the server.

Only submitted searches call Tavily. Queries are capped, requests time out after 12 seconds,
links allow HTTP(S) only, and closing the scene aborts the browser request. The existing
server usage limits still apply. Keyless rate limits or unavailable service produce a
retryable message rather than invented products or prices.

## Verification

Local verification: lint passed for 78 JS files; 76 unit tests and 64 Chrome tests passed.
A real localhost form submission returned five Tavily source cards with no checkout.
After matching the ElevenLabs agent/tool IDs to the current API key's workspace and
restarting Node, a fresh live session connected, called `open_scene` in real-search
mode, and returned five source cards with exactly one Tavily request and no quota error.
No purchase was attempted. When replacing an ElevenLabs key, ensure its agent/tool IDs
belong to the same workspace, and restart Node to load the new environment.
