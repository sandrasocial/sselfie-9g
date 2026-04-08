# TASK V-02 — Fix Welcome Flow (First Generation Conversion)
Priority: URGENT · Fix this first before anything else
Estimated time: 3-4 hours
Context: Audit found signup→first generation conversion = 0/5 (0%). This is the #1 retention killer.

## Problem
New users sign up, get 2 welcome credits, see a complex interface,
get confused, never generate a single image, and leave.
The product never gets a chance to show what it can do.

## Goal
Every new user generates at least one AI image in their first session.
That one moment of magic is what converts free users to paid members.

## What to build

### New user onboarding flow (replace or overlay current welcome)

Step 1 — Maya greets them immediately on first login
Maya says (exact copy to use):
"Hey gorgeous 🤍 I'm Maya — your personal AI brand director.
Let's create something amazing right now.
Upload one selfie and tell me one word that describes your brand vibe.
That's all I need."

Step 2 — User uploads selfie + types one word
Simple two-input screen. Nothing else visible.
Examples of brand vibe words: "bold", "soft", "luxury", "playful", "minimal"

Step 3 — Maya generates one image immediately
Use Pro mode (Nano Banana) with the reference image.
Maya picks a concept based on their one word.
Deduct 1 credit automatically.
Show a loading state with Maya saying:
"Creating your first brand photo... this is going to be good 🤍"

Step 4 — Image appears with upgrade prompt
Show the generated image full screen.
Below it: "This is what your brand can look like. Every week. On autopilot."
CTA button: "Start your membership — unlock unlimited"
Secondary text: "1 credit used · 1 remaining"

Step 5 — If they don't upgrade, Maya follows up after 24h
Send one email via Resend:
Subject: "Your brand photo is waiting for you"
Body: show their generated image + membership CTA

## Technical notes
- Trigger this flow for new users only (check: created_at within last 24h + no prior generations)
- Use existing Pro mode generation pipeline
- Do NOT break existing flow for current members
- Feature flag this: FEATURE_NEW_WELCOME_FLOW = true
- Track: signup_to_first_gen conversion rate (add to analytics_events)

## Out of scope
- Do NOT change payment or credit logic
- Do NOT redesign the full app UI
- Do NOT touch Maya's system prompt

## Acceptance criteria
- [ ] New user sees Maya greeting on first login
- [ ] Selfie upload + one word input works
- [ ] Image generates successfully using 1 credit
- [ ] Upgrade prompt appears after generation
- [ ] Feature flag controls rollout
- [ ] Existing member flow completely unchanged
- [ ] Conversion event tracked in analytics_events
