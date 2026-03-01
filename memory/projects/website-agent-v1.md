# Website Agent V1 — Current Sprint

*Last updated: 2026-02-28*

---

## What It Is

An AI agent that manages Sandra's website content autonomously. Reads brand guidelines, generates on-brand copy, updates pages without requiring Sandra to write everything manually.

**Price:** €27/month standalone (NOT bundled with Studio)
**Rationale:** Validated by north-revenue audit — mini-products generated €0, 47% churn rate. Website Agent is the highest-ROI next build.

---

## Why This (Not Something Else)

From the north-revenue audit (Feb 28, 2026):
- Mini-products never launched in checkout → €0 revenue
- 47% churn rate on Studio → retention problem, not acquisition
- Website Agent addresses the core need: Sandra needs to produce more content faster without hiring
- €27/month is accessible to her target audience (€0-€80K income women)

**This decision is LOCKED.** Any agent suggesting a different direction must be corrected and pointed to:
`docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md`

---

## Sprint Plan (2 Weeks)

| Phase | Task | Lead | Status |
|-------|------|------|--------|
| W1-A | Security hardening (north-notifier token, bridge auth) | north-code | ⏸ Awaiting Sandra |
| W1-B | Core agent loop | north-code | Pending |
| W1-C | Website read/write capabilities | north-code | Pending |
| W2-A | Brand voice layer integration | north-content | Pending |
| W2-B | Content generation engine | north-content | Pending |
| W2-C | Dashboard + launch prep | north-product | Pending |

**Start W1-A:** Sandra needs to give go/no-go on security hardening first

---

## Related Files

- Spec: `docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md`
- Pivot log: `~/stella/PIVOT-LOG-2026-02-28.md`
- Revenue justification: `~/stella/reports/REVENUE-IMPACT-WEBSITE-AGENT-2026-02-28.md`
