# [FEATURE NAME] — Feature doc template

Use this structure for every feature doc in `docs/features/`. Copy this file and replace placeholders.

---

## 1. Overview

- **Feature name:** (e.g. Maya)
- **One-line:** (What the feature is for the user.)
- **Entry points:** (URLs and in-app navigation that open this feature.)
- **Who can access:** (Free / paid blueprint / Studio / admin; any gating.)

---

## 2. User journey (start to finish)

List every screen and step a user can take, in order. Include branches (e.g. “if no credits…”).

| Step | Screen / action | What user sees / does |
|------|------------------|------------------------|
| 1    | …                | …                      |
| 2    | …                | …                      |

---

## 3. Frontend

- **Routes (pages):** (e.g. `app/studio/page.tsx`, `app/maya/page.tsx`.)
- **Main component(s):** (e.g. `SselfieApp`, `MayaChatScreen`.)
- **Key UI state:** (e.g. active tab, selected image, chat mode.)
- **Navigation:** (How user moves within the feature and to other features; URL hash or tab state.)
- **Code paths:** (List of relevant component files.)

---

## 4. Backend

- **API routes:** (List of `app/api/...` routes this feature calls or that serve it.)
- **Server actions:** (If any; file paths.)
- **Cron / webhooks:** (If any job or webhook updates data this feature uses.)
- **Code paths:** (List of relevant API and lib files.)

---

## 5. Logic (credits, entitlements, access)

- **Credits:** (Where credits are checked or deducted in this feature.)
- **Entitlements / access:** (How we decide who can use what; subscription, product_type, flags.)
- **Data flow:** (Where data is read from/written to; DB tables or external APIs if relevant.)

---

## 6. Code map (for agents)

Short list of the exact files that implement this feature. Agents should use this to navigate.

- **Pages:** …
- **Components:** …
- **API routes:** …
- **Lib / shared:** …

---

## 7. Current value / pain (research)

- **Current value:** (What members get from this feature today.)
- **Pain / friction:** (From funnel, support, or feedback — link to `output/automation/` when possible.)
- **Audience evidence:** (Quotes or metrics from digests; “to be filled by North/research”.)

---

## 8. Opportunities (for rebuild / AI)

- **Ideas:** (Ways to increase value or use newer AI; to be filled by research and proposals.)
- **Constraints:** (Design system, constitution, no breaking paid flows.)

---

## Changelog

| Date       | Change |
|------------|--------|
| YYYY-MM-DD | Initial doc from template. |
