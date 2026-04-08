# TASK V-04 — Put Academy Inside the User Journey
Priority: Medium · Do after V-03 is complete
Estimated time: 2 hours
Context: Audit found Academy near-zero opens. It exists but nobody finds it.
It needs to become a natural next step — not a separate tab.

## Problem
Academy is a separate section that users have to intentionally navigate to.
Nobody does. It sits unused while members churn because they don't know
how to use the app properly.

## Goal
Academy content appears naturally inside the user journey at the right moment.
Users don't go TO Academy — Academy comes to THEM via Maya.

## What to build

### Trigger points — Maya surfaces Academy content contextually

Trigger 1 — After first generation
Maya says after image appears:
"Want to see exactly how to use this image for your Instagram?
I have a quick 2-minute tutorial. Type SHOW ME to see it."
→ Opens relevant Academy lesson inline (not new tab)

Trigger 2 — After 3 generations with no content plan
Maya proactively says:
"You've created some beautiful images 🤍 Want me to show you
how to turn these into a full month of content?
I have a system that takes 20 minutes."
→ Links to content calendar Academy lesson

Trigger 3 — When user seems stuck (no activity for 48h)
Send one email:
Subject: "Hey [name] — Maya has something for you"
Body: "I noticed you haven't been in for a bit.
Here's a 3-minute tutorial that will change how you use SSELFIE."
→ Deep link back into app to specific Academy lesson

### Technical implementation
- Add maya_academy_trigger() function that checks user state
- Triggers fire based on: generation_count, last_active, content_plan_exists
- Academy lesson renders inline in Maya chat as a card component
- Track: academy_opens_from_maya (add to analytics_events)
- Do NOT change Academy content or structure
- Do NOT remove Academy tab — keep it as secondary navigation

## Out of scope
- Do NOT rewrite Academy content
- Do NOT redesign Academy pages
- Do NOT change credit costs

## Acceptance criteria
- [ ] After first generation Maya suggests relevant Academy lesson
- [ ] After 3 generations Maya suggests content system lesson
- [ ] 48h inactive email sends with Academy deep link
- [ ] Academy lesson renders inline in Maya chat
- [ ] Academy tab still accessible as before
- [ ] Events tracked in analytics_events
