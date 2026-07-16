# Claude Desktop Templates

These tracked files are the canonical, safe templates for SSELFIE-specific Claude Desktop agents and skills.

Claude's working `.claude/` folder is intentionally local and ignored by Git. The Claude Desktop alignment spec installs these templates into that local folder. Do not maintain business facts in a local copy. Change the tracked template, run `pnpm audit:context-drift`, and then mirror it locally.

Source of brand law: `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`.

Source of company model, offer status, channel rules, and AI-team roles:
`docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`.

The tracked scheduled-task templates under `scheduled-tasks/` are canonical. Mirror them into
`~/.claude/scheduled-tasks/` after changes; never edit the local copy into a competing strategy.
