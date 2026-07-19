# Claude Desktop Templates

These tracked files are the canonical, safe templates for SSELFIE-specific Claude Desktop agents,
skills, and scheduled drafting tasks.

Claude's working `.claude/` folder is intentionally local and ignored by Git. The Claude Desktop alignment spec installs these templates into that local folder. Do not maintain business facts in a local copy. Change the tracked template, run `pnpm audit:context-drift`, and then mirror it locally.

Source of brand law: `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`.

Source of company model, offer status, channel rules, and AI-team roles:
`docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`.

Source of shared agent behavior:
`docs/business/SANDRA_AI_TEAM_BRAIN_PACK_2026-07-16.md`.

The tracked scheduled-task templates under `scheduled-tasks/` are canonical. Mirror them into
`~/.claude/scheduled-tasks/` after changes; never edit the local copy into a competing strategy.

The tracked skills under `skills/` mirror into `~/.claude/skills/`. They may research, recommend,
and draft freely. `Read-only` means no send, publish, charge, deploy, or live mutation; it does not
mean no useful thinking. A new idea can be explored without becoming an approved offer.

The local `partnership-reply-watch` is a temporary attended monitor through 2026-07-21. It is not a
permanent canonical task and must not be copied into the public repository because it contains
private conversation identifiers.
