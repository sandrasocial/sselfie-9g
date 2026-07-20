# Completed releases

## 2026-07-20 — Native Codex workflow cleanup

Removed repo-hosted AI task queues, custom agents, duplicated skills, tool-specific configuration,
generated automation commits, and their meta-tests. SSELFIE now uses native Codex plans, goals,
skills, connectors, and worktrees. The repository retains a short native `AGENTS.md`, product code,
customer/payment automations, product tests, canonical brand sources, and release safeguards.

Why: competing agent systems and stale task files were creating drift and making completed work look
unfinished.
