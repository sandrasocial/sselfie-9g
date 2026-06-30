# ManyChat bridge wiring — PROMPT -> latest five free prompts (updated 2026-06-30)

The app-side code is locked to the PROMPT-first model. The public CTA is `PROMPT`. ManyChat should send people to the free AI prompts page, not to numbered prompt pages.

Live correction 2026-06-30: numbered keywords were retired because they created too much operational complexity. The free page is `/ai-prompts`, and it shows the latest five SSELFIE shoot previews. The page is capped by `FREEBIE_TOTAL_SHOOT_LIMIT = 5` and refreshed by the newest published/freebie collection selection.

## The resolver contract (verified in code)
- **Default method/URL:** `GET https://www.sselfie.ai/api/manychat/prompt`
- **Do not pass numbers by default.** If an old flow accidentally includes `n={{last_text_input}}`, the resolver still returns the five-latest free page. This is intentional guardrail behavior.
- **Auth (pick one):** header `x-bridge-secret: <MANYCHAT_BRIDGE_SECRET>` (preferred), or header `x-manychat-secret:`, or `&secret=` in the URL. The value is the `MANYCHAT_BRIDGE_SECRET` set in Vercel env. No secret / wrong secret → 401.
- **Response:**
  ```json
  {
    "ok": true,
    "found": false,
    "fallback": true,
    "mode": "latest_five_free_prompts",
    "title": "The latest five SSELFIE shoot previews",
    "pageUrl": "https://www.sselfie.ai/ai-prompts?...cta_keyword=PROMPT",
    "vaultCheckoutUrl": "https://www.sselfie.ai/checkout/prompt-vault?...cta_keyword=PROMPT"
  }
  ```

## ManyChat setup (existing "Prompt Pack Automation")
1. **Trigger:** keep the live evergreen "User comments on any Post or Reel" and DM triggers that contain `PROMPT`.
2. **External Request action:**
   - GET `https://www.sselfie.ai/api/manychat/prompt`
   - Header `x-bridge-secret` = the secret (Sandra pastes this).
   - Map response fields -> custom fields: `pageUrl` -> "Free Prompt Page URL", `title` -> "Free Prompt Title", `vaultCheckoutUrl` -> "Vault URL".
3. **Opening DM (Meta needs a tap):** button "Send me the prompt".
4. **Delivery DM:** `Here are the latest five SSELFIE shoot previews. Tap here: {{Free Prompt Page URL}}` + optional "See the Vault" button -> `{{Vault URL}}`.

Current live setup should stay tap-first. The first private reply creates the user interaction, then the attached delivery message sends the tracked free prompt page link. Do not convert it back to a first-message website button.

## What not to do

- Do not create per-number ManyChat keywords.
- Do not wire `n={{last_text_input}}`.
- Do not tell Sandra to publish `Comment 14`, `Comment 104`, etc. as the default.
- Do not send PROMPT traffic to `/p/latest`.

## Who does what
- Sandra: approves any live ManyChat publish and enters the secret if the external request is used.
- Claude/Codex: can guide non-secret browser wiring, verify the test DM, and keep this doc aligned with code.
