# Task Tracking

Tasks live in git as plain Markdown, managed by [Backlog.md](https://github.com/MrLesk/Backlog.md) — no external tracker account needed to read or run the backlog. Each task is one file under [`.backlog/tasks/`](../.backlog/tasks/), so file-level diffs are the change history.

This is a short orientation, not the manual. For anything beyond it, ask the tool itself — it's more current than any doc we could write by hand.

## Setup

Already a devDependency (`pnpm add -Dw backlog.md`) and initialized in [`.backlog/`](../.backlog/), so there's nothing to install — just run commands through `pnpm exec backlog ...` (or `pnpm dlx backlog.md ...` if you haven't run `pnpm install` yet).

## Quick start

```bash
# Read this first — it's the actual, up-to-date workflow guide
pnpm exec backlog instructions overview

# Everyday commands
pnpm exec backlog task list
pnpm exec backlog task create "Title" -d "Description" --ac "Acceptance criterion"
pnpm exec backlog task edit TASK-1 -s "In Progress" -a @yourname
pnpm exec backlog board       # terminal kanban
pnpm exec backlog browser     # local web UI, drag-and-drop
```

Always go through the `backlog` CLI (or its web UI) rather than hand-editing task files — it keeps IDs, statuses, and dependency links consistent.

## Domain

One project uses one task-ID prefix (`TASK-*` here), so domain isn't in the ID. Backlog.md has a `project` field built for exactly this — tagging each task with one project in a monorepo — configured in [`.backlog/config.yml`](../.backlog/config.yml) as `projects: ["frontend", "backend", "inference", "eval"]`, matching the [domain table in the README](../README.md#domains). Set it with `--project <domain>` on `task create`/`task edit`, and filter with `backlog task list --project inference`. Reserve `--label` for cross-cutting, non-exclusive tags (e.g. `stretch-goal`) instead of domain — a task belongs to exactly one domain, which is what `project` (single-value) models, not `labels` (multi-value).

## Dependencies and due dates

`backlog task create/edit` supports `--dep TASK-N` (shortcut for `--depends-on`, rejected if it would create a cycle) and `--due-date YYYY-MM-DD`. Run `backlog task edit --help` for the full flag list — it's generated from the installed version, so it won't drift out of date the way a hand-copied list here would.

## Learn more

`pnpm exec backlog instructions overview` and `pnpm exec backlog --help` are the source of truth for this project's installed version. The project's own [README](https://github.com/MrLesk/Backlog.md) and [CLI reference](https://github.com/MrLesk/Backlog.md/blob/main/CLI-INSTRUCTIONS.md) cover everything else (milestones, search, the web UI, MCP integration).
