# SUITE Calendar, Stories, and Learn — shipped state

Date: 2026-07-18

## Member flow

- Calendar keeps the live Instagram-style grid as the main surface.
- A member can open `Content context` to review or update what Maya knows about her business, audience, story, goals, and content pillars.
- `Quick guide` teaches the actual three-step flow: choose a post, approve Maya's idea, then review and use the finished post.
- `Visual direction` stores one look for the current grid and uses real saved preview imagery.
- Selecting a Calendar post hands the post into the same Maya concierge used by Create. Maya's concept choice is the approval; progress and the completed work stay attached to the post.
- Members can add three more post slots at a time, up to 30 posts per grid.

## Story Studio

- Clicking an existing Highlight opens that sequence in Story Studio.
- Members can build and save multiple sequences, choose Gallery images in order, preview them in 9:16, download a sequence, and keep a Maya freshness note.
- A missing sequence or Highlight cover can be handed to Maya without creating a separate Calendar-only chat.
- Existing `feed_highlights` storage is preserved. Sequence data is stored as versioned JSON in the existing prompt field, so older Highlights remain readable without a migration.

## Learn / Maya Coach

- Learn starts with one question: where the member feels stuck.
- Maya Coach recommends one owned course or product, not a second catalogue.
- The member can open the lesson, carry it into Calendar, carry it into Maya, or save the plan.
- Saved plans use `suite_learning_plans`, created by `migrations/20260718_suite_learning_plans.sql`.

## Server boundaries

- Feed rows, Highlights, saved style previews, and learning plans are authenticated and owner-scoped.
- Multi-row writes use transactions. Row creation also takes a feed-level advisory lock so repeated clicks cannot create overlapping positions.
- Analytics allowlists include Story Studio and Learn actions. These events measure behavior only; revenue truth remains in Stripe/subscription data.
- Maya prompt assembly, model routing, Vault retrieval, and memory injection were not changed.

## Release verification

- Component/regression tests cover content context, guide demos, portrait grid, row ownership, multi-sequence Stories, Maya cover handoff, saved Learn plans, and analytics contracts.
- Authenticated browser QA covers desktop and 390 × 844 mobile Calendar, Content context, all guide steps, Visual direction, Story Studio, Learn, Learn → Calendar, and Learn → Maya.
- The production migration was applied and the required `suite_learning_plans` columns were verified before release.
