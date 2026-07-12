# SUITE Post-Success Review Capture

Last updated: 2026-07-12

Status: Current implementation contract.

## Purpose

SSELFIE asks for a review only after the customer has demonstrated a real success signal. The
review prompt is not a permanent widget and does not appear at checkout, on first app open, or
immediately after generation.

The qualifying signal is the third recorded `suite_image_downloaded` event for the authenticated
Neon user.

## Customer Flow

1. A signed-in customer downloads an App v3 result from a concept card, lightbox, or Gallery.
2. `/api/testimonials/eligibility` records the authenticated download.
3. The server checks the real download count, prior SUITE review, recent dismissal, and recent
   prompt.
4. At three downloads, the app shows one temporary post-success invitation.
5. Opening the invitation reveals a text-only rating and testimonial form.
6. Submission requires explicit permission to publish.
7. `/api/testimonials/submit` derives identity from Supabase and Neon, validates the input, and
   stores an unpublished row in `admin_testimonials`.
8. Sandra reviews and publishes from `/admin/testimonials`.

## Eligibility Rules

- Minimum downloads: 3.
- Existing in-app SUITE review: suppressed.
- Recent dismissal: suppressed for 30 days.
- Recently shown prompt: suppressed for 7 days.
- Failed eligibility or analytics calls never interrupt the download.
- The first release is text-only. It does not accept uploads or caller-supplied image URLs.

## Security Contract

- Eligibility and submission are POST-only and require a valid Supabase session.
- Neon identity is resolved with `getUserByAuthId`.
- Customer name, email, and user ID are never trusted from the request body.
- Rating must be an integer from 1 through 5.
- Review text must contain 10 through 1,000 trimmed characters.
- Consent must be exactly `true`.
- Submission rechecks the three-download threshold server-side; the prompt cannot be bypassed with
  a direct request.
- Submission attempts are rate-limited per authenticated Neon user.
- Admin notification HTML escapes all customer-controlled values.
- `migrations/20260712_suite_review_capture.sql` provides the database concurrency guard for one
  in-app SUITE review per authenticated user.

## Analytics

Behavior events live in `analytics_events` and never represent revenue:

- `suite_image_downloaded`
- `suite_review_prompt_shown`
- `suite_review_prompt_opened`
- `suite_review_prompt_dismissed`
- `suite_review_submitted`

Approved proof lives in `admin_testimonials`. Revenue remains sourced only from Stripe or
qualifying `stripe_payments` rows.

## Runtime Owners

- Eligibility: `app/api/testimonials/eligibility/route.ts`
- Submission: `app/api/testimonials/submit/route.ts`
- Shared download helper: `lib/testimonials/review-capture-client.ts`
- Validation and policy: `lib/testimonials/review-contract.ts`
- Prompt UI: `components/testimonials/post-success-review-prompt.tsx`
- Moderation: `app/admin/testimonials/page.tsx`
- Admin API: `app/api/admin/testimonials/route.ts`
- Download hooks:
  - `components/app-v3/concept-card.tsx`
  - `components/app-v3/image-lightbox.tsx`
  - `components/app-v3/gallery-view.tsx`

## Retired Paths

The public `/share-your-story` page redirects to `/app`. The old floating feedback widget, its
customer-facing feedback routes, its upload route, and its AI-response route are removed. Historical
`feedback` rows remain intact and readable by the existing admin support/reporting surfaces.

The old generic feedback system must not be recreated as a review channel. Support remains the
attended support-email path in App v3.

## Deployment Gate

Before production promotion:

1. Apply `migrations/20260712_suite_review_capture.sql` to the production Neon database.
2. Run the focused review tests.
3. Run the repository typecheck and diff check.
4. Smoke one authenticated third-download flow and confirm the new review lands unpublished in
   `/admin/testimonials`.

No approved proof is automatically published. Public proof display stays a separate attended
moderation decision.
