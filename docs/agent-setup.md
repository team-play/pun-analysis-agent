# Agent Setup Guide

Instructions for bootstrapping a fresh clone of this repo into a working local dev environment — written to be followed by **any** coding agent (Claude Code, Cursor, Aider, Copilot, or a human at a terminal), not a Claude-specific mechanism. If you're an agent that discovered this file through [`AGENTS.md`](../AGENTS.md), you're in the right place; there's nothing else you need to read first.

**Out of scope:** Google Cloud / `gcloud` / Firebase CLI setup and API key provisioning. That's being handled separately — see the Secrets section of [`docs/local-setup.md`](local-setup.md) if you need it.

Re-running these steps is safe: skip anything already satisfied rather than reinstalling or repeating it.

## 1. Detect the environment

Determine the OS you're running on:
- **macOS** → use the Homebrew commands below.
- **Windows** → first find out whether the user is working inside **WSL2** (an Ubuntu-style shell, `uname` reports Linux) or **native PowerShell/cmd**. Ask if it isn't obvious from the shell you're already running in — don't assume, since the install commands are completely different between the two.
- **Linux** (native, or WSL2 under Windows) → use the same apt-based commands as the WSL2 case below.

## 2. Check for required tools

Check for each of these, in order, and note what's missing:

| Tool | Check |
|---|---|
| git | `git --version` |
| Node.js | `node --version` (need `>=22`, per the `engines` field in the root [`package.json`](../package.json)) |
| pnpm | `pnpm --version` |
| uv | `uv --version` |

Python itself doesn't need a separate check — `uv` fetches its own interpreter on demand (it already did this when the `inference/` and `eval/` packages were first created, pulling down CPython automatically).

## 3. Install anything missing

For each missing tool, **propose the exact command below and get explicit confirmation before running it.** Never install anything silently.

**macOS (Homebrew):**
```bash
brew install git node pnpm
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows/WSL2 or native Linux (apt):**
```bash
sudo apt update && sudo apt install -y git nodejs npm
npm install -g pnpm
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows native PowerShell:**
```powershell
winget install Git.Git OpenJS.NodeJS
corepack enable pnpm
irm https://astral.sh/uv/install.ps1 | iex
```
If the `irm ... | iex` command is blocked, it's PowerShell's execution policy — the user will need to relax it for the current process (`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`) or install `uv` via `winget install astral-sh.uv` instead.

## 4. Install project dependencies

Once the tools above are present:

```bash
# from the repo root — installs both frontend/ and backend/ (shared pnpm workspace)
pnpm install

# each Python package manages its own environment
cd inference && uv sync && cd ..
cd eval && uv sync && cd ..
```

## 5. Validate the result

Run the cross-platform validation script:

```bash
node scripts/verify-setup.mjs
```

This runs the same checks CI runs (`pnpm run lint`, `pnpm run check:mermaid`, `uv run ruff check .` in both Python packages, `uv run pytest` in `inference/`) plus a couple of live smoke checks (briefly boots the backend and frontend dev servers to confirm they actually respond). It prints a pass/fail summary per check and exits non-zero if anything failed — fix whatever it flags before considering setup done.

## 6. Report back

Summarize what was installed (if anything), what was already present, and the validation result — so the user knows exactly what changed on their machine.
