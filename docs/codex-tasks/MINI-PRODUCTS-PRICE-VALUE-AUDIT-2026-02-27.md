# MINI PRODUCTS: PRICE-VALUE AUDIT (2026-02-27)

## Scope
Recheck launch economics and product pricing/value fit before shipping Caption Studio + Academy mini-product flow.

## 1) Live Revenue Reality (Stripe vs DB)

### Source-of-truth checks run
- `pnpm run audit-revenue`
- `pnpm run audit-subscriptions`
- direct Node script against Stripe API + Neon DB (`STRIPE_SECRET_KEY` + `DATABASE_URL` from `.env.local`)

### What is true right now
- Stripe key mode: `live`
- Stripe total subscriptions: `42`
- Stripe active subscriptions: `16`
- Stripe active+trialing+past_due+unpaid: `18`
- Stripe MRR from active subscriptions (item-level): `160,600` cents (`$1,606`)
- Stripe paid invoices (last 30 days): `17` invoices, `106,800` cents (`$1,068`)

### DB comparison
- DB live active subscriptions (all product types): `29`
- DB live active `sselfie_studio_membership`: `16`
- DB active `paid_blueprint` rows: `25` (13 live / 12 test) and these are inflating "active subs" counts if treated as recurring members.
- `academy_course_purchases`: exists, currently empty (no mini-product purchases recorded yet).

### Revenue interpretation
- Previous "67 x €97" style calculations were invalid for current live MRR.
- Real recurring base is currently closer to `16` active memberships (`~$1.6k MRR`) not 67 paying members.
- Inference: reporting needs to separate recurring memberships from one-time/entitlement rows by `product_type`.

## 2) External Benchmark Snapshot (Web Research)

### Low-ticket creator products / mini-courses
- Stan Store guidance for low-ticket starter products: generally `~$17-$47` ([stan.store](https://stan.store/blog/how-to-price-digital-products)).
- Teachable guidance for mini-courses: often in the `~$19-$99` band ([teachable.com](https://teachable.com/blog/how-to-price-online-course)).
- Mighty Networks membership benchmarking: average membership around `$48/mo`, low end around `$19`, high end can exceed `$100` depending on value depth ([mightynetworks.com](https://www.mightynetworks.com/resources/how-much-to-charge-for-membership-site)).

### Adjacent alternatives users compare you against
- ChatGPT Plus: `$20/mo` ([OpenAI Help](https://help.openai.com/en/articles/6950777-what-is-chatgpt-free-plan), [OpenAI Pricing](https://openai.com/chatgpt/pricing/)).
- Jasper Pro: `$69/mo` monthly (`$59/mo` annual equivalent) ([jasper.ai](https://www.jasper.ai/pricing)).
- Later pricing (yearly rates shown in crawl): Starter `$16.67`, Growth `$30`, Advanced `$53.33` ([later.com](https://later.com/pricing)).
- Buffer pricing: Essentials `$5/mo` per channel, Team `$10/mo` per channel ([buffer.com](https://buffer.com/pricing)).

Note: several pricing pages are dynamic and geo-sensitive; values above are from latest crawl snapshots and can change.

## 3) Price vs Value Assessment (Current Ladder)

### What To Say (€17)
- Position: strong.
- Reasoning: matches low-ticket impulse range and directly solves the highest-friction pain ("I don’t know what to post").
- Risk: if output feels generic, users compare it to ChatGPT $20/mo and churn fast.

### Show Up (€27)
- Position: strong.
- Reasoning: still impulse-buy territory while promising a concrete 30-day system.
- Risk: must deliver a done-for-you calendar artifact, not theory.

### Get Paid (€47)
- Position: acceptable, possibly underpriced once outcomes are proven.
- Reasoning: this is closest to revenue outcome; can support higher price after proof assets and testimonials.

### Membership (€97/mo)
- Position: defensible only with compounding monthly value.
- Reasoning: higher than many scheduling/content tools, so it must feel like "strategy + execution + assets + coaching," not just "another AI tool."

## 4) Should We Build It Differently?

### Yes: keep prices, increase value density + activation clarity
1. Keep launch pricing at `€17 / €27 / €47` for acquisition speed.
2. Do not cut membership price before activation fixes; first fix onboarding and delivery completion.
3. Shift delivery to immediate tangible artifacts per product (download/save/share in one screen).
4. Add one high-leverage value layer to justify €97: monthly live implementation clinic or monthly "done-for-you campaign pack".
5. Standardize product completion metric per purchase (not just purchase count):
   - Product opened
   - Core asset generated
   - Asset exported/saved
   - First in-app next step taken

## 5) Launch Decision
- Recommendation: proceed with current mini-product price points.
- Do not reprice downward now.
- Highest-leverage move is activation + deliverable clarity, then revisit price after 2-3 weeks of real conversion and completion data.

## 6) Immediate Execution List
1. Ship hotfix for Pro mode runtime TDZ bug (`ConceptCardPro` call-before-initialization hazard).
2. Ship hotfix for Maya Pro product prompt injection (product context now actually appended into system prompt).
3. Update analytics/revenue dashboards to separate:
   - recurring memberships
   - one-time products
   - entitlement rows (`paid_blueprint`) that are not recurring MRR.
4. Launch with current ladder and instrument completion KPIs before changing prices.

