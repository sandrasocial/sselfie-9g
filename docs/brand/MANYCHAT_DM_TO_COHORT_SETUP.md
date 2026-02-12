# ManyChat DM -> Cohort Intake Setup

## Goal

Turn `DM COHORT` replies into qualified traffic and lead records with clean attribution.

## Recommended setup (simple + reliable)

1. Keep one CTA in Stories: `DM COHORT`.
2. ManyChat keyword automation triggers on `COHORT`.
3. ManyChat auto-reply sends one tracked apply link.
4. Lead completes `/apply/brand-engine`.
5. Lead appears in `/admin/brand-engine-applications` with source tags.

## Tracked apply link

Use this as your default ManyChat button URL:

`https://sselfie.ai/apply/brand-engine?sourceChannel=instagram_dm&sourceDetail=manychat_day1&utm_source=instagram_dm&utm_medium=manychat&utm_campaign=cohort_day1`

Day-based variants:

- Day 1: `...sourceDetail=manychat_day1&utm_campaign=cohort_day1`
- Day 2: `...sourceDetail=manychat_day2&utm_campaign=cohort_day2`
- Day 3: `...sourceDetail=manychat_day3&utm_campaign=cohort_day3`
- Day 4: `...sourceDetail=manychat_day4&utm_campaign=cohort_day4`
- Day 5: `...sourceDetail=manychat_day5&utm_campaign=cohort_day5`
- Day 6: `...sourceDetail=manychat_day6&utm_campaign=cohort_day6`
- Day 7: `...sourceDetail=manychat_day7&utm_campaign=cohort_day7`

## ManyChat first auto-reply template

```text
Love this. I opened a few Cohort spots for women who want a real AI growth system, not more random tools.

Apply here and I’ll review personally:
https://sselfie.ai/apply/brand-engine?sourceChannel=instagram_dm&sourceDetail=manychat_day1&utm_source=instagram_dm&utm_medium=manychat&utm_campaign=cohort_day1
```

## Optional manual backup (inside admin)

If someone refuses to fill the form but is interested, add them manually:

- Open `/admin/brand-engine-applications`
- Use `Quick Add DM Lead`
- Add `name` + `@instagram` (email optional)
- Keep campaign tag (for example `ig_day1_dm_cohort`)

This drops the lead into `contacted` so it shows as a `Call` task on Today Action Board.

