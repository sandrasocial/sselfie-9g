# ManyChat bridge wiring — the last step (2026-06-18)

The code is live (MANYCHAT-FUNNEL-01, commit 5d442304). This is the one remaining ManyChat-side setup: wire the comment trigger to call the resolver so a number → the right prompt page automatically. ⚠️ The secret must be entered by Sandra (Claude is not permitted to type API secrets/tokens into fields).

## The resolver contract (verified in code)
- **Method/URL:** `GET https://www.sselfie.ai/api/manychat/prompt?n={{number}}`
- **Auth (pick one):** header `x-bridge-secret: <MANYCHAT_BRIDGE_SECRET>` (preferred), or header `x-manychat-secret:`, or `&secret=` in the URL. The value is the `MANYCHAT_BRIDGE_SECRET` set in Vercel env. No secret / wrong secret → 401.
- **Response when the number exists:**
  ```json
  { "ok": true, "found": true, "number": 14, "title": "Marble Café · Outfit Shot",
    "pageUrl": "https://www.sselfie.ai/p/14",
    "vaultCheckoutUrl": "https://www.sselfie.ai/checkout/prompt-vault?...prompt_n=14",
    "sourceCollection": "..." }
  ```
- **Response when not published yet:** `{ "ok": true, "found": false, "title": "That prompt is coming", "pageUrl": "<vault fallback>", "fallbackMessage": "..." }` — so unknown numbers gracefully send to the Vault, never a dead end.

## ManyChat setup (in "Prompt Pack Automation", or a new numbered flow)
1. **Trigger:** evergreen "User comments on any Post or Reel" — keyword = a number (or keep PROMPT and capture the number from the comment text).
2. **External Request action:**
   - GET `https://www.sselfie.ai/api/manychat/prompt?n={{number}}`
   - Header `x-bridge-secret` = the secret (Sandra pastes this).
   - Map response fields → custom fields: `pageUrl` → "Prompt Page URL", `title` → "Prompt Title", `vaultCheckoutUrl` → "Vault URL".
3. **Opening DM (Meta needs a tap):** button "Send me the prompt".
4. **Delivery DM:** `Here you go, {{Prompt Title}} 📸 👉 {{Prompt Page URL}}` + a "See the Vault" button → `{{Vault URL}}`.

## The one fiddly bit: capturing `{{number}}`
The number lives in the comment text. ManyChat needs to pass that into the request as `n`. Easiest reliable path is to test with a known number first (comment "14" → confirm the DM sends the /p/14 link). If pulling the number out of the comment text proves awkward in ManyChat, the fallback is one keyword row per number (add "14" → request with n=14) — still one automation, ~20s per post, no per-post automation rebuild.

## Who does what
- Sandra: enters the secret + builds/tests the external request (Claude can guide live but cannot type the secret).
- Claude: can drive the non-secret parts via browser on Sandra's screen and verify the test DM.
