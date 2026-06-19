# ManyChat bridge wiring — PROMPT-first setup (updated 2026-06-19)

The app-side code is ready for the PROMPT-first model. The default public CTA is still `PROMPT`; prompt numbers stay as internal/product IDs and optional exact links.

The one remaining live-platform step is to update the existing `Prompt Pack Automation` delivery so it sends one current prompt page, not the full `/ai-prompts` pack. Any live ManyChat publish should be confirmed by Sandra before saving.

## The resolver contract (verified in code)
- **Default method/URL:** `GET https://www.sselfie.ai/api/manychat/prompt`
- **Exact optional lookup:** `GET https://www.sselfie.ai/api/manychat/prompt?n={{number}}`
- **Auth (pick one):** header `x-bridge-secret: <MANYCHAT_BRIDGE_SECRET>` (preferred), or header `x-manychat-secret:`, or `&secret=` in the URL. The value is the `MANYCHAT_BRIDGE_SECRET` set in Vercel env. No secret / wrong secret → 401.
- **Response when a number exists:**
  ```json
  { "ok": true, "found": true, "fallback": false, "number": "14", "title": "Marble Café · Outfit Shot",
    "pageUrl": "https://www.sselfie.ai/p/14",
    "vaultCheckoutUrl": "https://www.sselfie.ai/checkout/prompt-vault?...prompt_n=14",
    "sourceCollection": "..." }
  ```
- **Response with no number or an unknown number:** returns the current free prompt with `found: false`, `fallback: true`, and `pageUrl: "https://www.sselfie.ai/p/latest"`. This keeps old comments and generic `PROMPT` comments frictionless.

## ManyChat setup (existing "Prompt Pack Automation")
1. **Trigger:** keep the live evergreen "User comments on any Post or Reel" and DM triggers that contain `PROMPT`.
2. **External Request action:**
   - GET `https://www.sselfie.ai/api/manychat/prompt`
   - Header `x-bridge-secret` = the secret (Sandra pastes this).
   - Map response fields → custom fields: `pageUrl` → "Prompt Page URL", `title` → "Prompt Title", `vaultCheckoutUrl` → "Vault URL".
3. **Opening DM (Meta needs a tap):** button "Send me the prompt".
4. **Delivery DM:** `Here you go, {{Prompt Title}}. Tap here: {{Prompt Page URL}}` + optional "See the Vault" button → `{{Vault URL}}`.

## Optional exact-prompt route for evergreen posts
For high-performing old reels where the prompt must stay exact:

1. Add a post-specific ManyChat comment trigger for that reel only.
2. Use the same master flow, but set/request `n=<prompt number>` before delivery.
3. The resolver returns `/p/{number}`.

Do not make numbered comments the default operating model. Numbers are for exact links, tracking, Vault labels, and the few evergreen posts worth mapping.

## Who does what
- Sandra: approves any live ManyChat publish and enters the secret if the external request is used.
- Claude/Codex: can guide non-secret browser wiring, verify the test DM, and keep this doc aligned with code.
