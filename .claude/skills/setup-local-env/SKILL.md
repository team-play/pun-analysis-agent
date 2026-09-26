---
name: setup-local-env
description: Bootstraps a fresh contributor's local dev environment for the pun-analysis-agent monorepo — detects the OS (macOS, Windows/WSL2, or native Windows), checks for git/Node.js/pnpm/uv, proposes install commands for anything missing (always with confirmation before running one), installs project dependencies, and validates the result. Use this whenever someone asks to set up, bootstrap, or get started with this repo locally; is a new contributor asking "how do I get this running" or "what do I need to install"; mentions missing tools like git, node, pnpm, or uv in the context of this project; has an outdated Node (below 24) or hits `ERR_UNKNOWN_FILE_EXTENSION ".ts"` running the backend; or says something like "I just cloned this, what now" or "set up my machine for this project."
---

# Setup Local Environment

The actual, tool-agnostic setup instructions live in [`docs/agent-setup.md`](../../../docs/agent-setup.md), written so any agent — not just Claude — can follow them. This file is a thin pointer, not a copy: don't duplicate those steps here, since a second copy would drift out of sync with the real one.

## What to do

1. Read and follow `docs/agent-setup.md` end to end. It covers, in order: detecting the OS (and asking whether a Windows user is in WSL2 or native PowerShell — don't assume), checking for git/Node.js/pnpm/uv, proposing the exact install command for anything missing, installing project dependencies (`pnpm install`, `uv sync`), and validating the result.
2. **Never install anything without explicit confirmation for that specific step** — this applies even if the user has approved a previous install in the same session.
3. The validation step runs `node scripts/verify-setup.mjs`, which mirrors this repo's CI checks (lint, Mermaid diagram validation, `ruff check` and `ruff format --check`, `pytest`) plus live smoke checks of the backend and frontend dev servers, then reports a pass/fail summary.
4. Report back what was installed, what was already present, and the validation result, so the user knows exactly what changed on their machine.

## Out of scope

Google Cloud / `gcloud` / Firebase CLI setup and API key provisioning are handled separately by the project maintainer right now. If it comes up, point to the Secrets section of [`docs/local-setup.md`](../../../docs/local-setup.md) instead of attempting it here.
