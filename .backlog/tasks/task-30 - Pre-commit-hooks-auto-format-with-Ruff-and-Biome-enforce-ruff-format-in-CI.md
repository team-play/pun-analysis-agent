---
id: TASK-30
title: 'Pre-commit hooks: auto-format with Ruff and Biome; enforce ruff format in CI'
status: In Progress
assignee:
  - '@yaisiel.torres'
created_date: '2026-09-26 19:09'
updated_date: '2026-09-26 19:12'
labels: []
dependencies: []
references:
  - lefthook.yml
  - .github/workflows/lint.yml
  - scripts/verify-setup.mjs
  - pnpm-workspace.yaml
type: chore
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Formatting is only enforced after the fact: CI runs `biome check` for JS/TS and `ruff check` (lint only) for Python, so nothing formats at commit time and nothing checks Python formatting at all — inference/candidates.py has already drifted from `ruff format`. Lefthook was chosen over the pre-commit framework so hooks run the lockfile-pinned Biome (node_modules) and per-package Ruff (uv.lock) instead of a second pinned copy that can drift from CI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A `pnpm install` on a dev machine installs a git pre-commit hook without any extra manual step
- [ ] #2 Committing staged JS/TS/JSON/CSS runs `biome check --write` on just those files and re-stages the fixes
- [ ] #3 Committing staged Python in inference/ or eval/ runs `ruff check --fix` then `ruff format` with that package's locked Ruff and config, and re-stages the fixes
- [ ] #4 Unstaged hunks of a partially staged file are left untouched by the hook
- [ ] #5 An unfixable lint error blocks the commit with the tool's message
- [ ] #6 CI (lint.yml) and scripts/verify-setup.mjs fail when inference/ or eval/ is not `ruff format`-clean, and both packages currently pass
- [ ] #7 `pnpm install --frozen-lockfile --filter backend` in the backend Docker build still succeeds
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add lefthook as a root devDependency; allow its postinstall in pnpm-workspace.yaml allowBuilds (not a root prepare script, which would run in the backend Docker build that has no .git).
2. lefthook.yml: parallel pre-commit jobs — biome check --write on {staged_files} (Biome's documented recipe), and per-package ruff check --fix && ruff format with root: inference/ and eval/; stage_fixed on all.
3. Add ruff format --check to lint.yml lint-python and to scripts/verify-setup.mjs; ruff format inference/candidates.py.
4. Verify: hook installed, fixes re-staged, partial staging preserved, unfixable lint blocks, md-only commit passes, Docker filter install unaffected.
5. Separate docs commit: local-setup.md, agent-setup.md, README if relevant.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented lefthook 2.1.14 + lefthook.yml; ruff format --check added to lint.yml and verify-setup.mjs; candidates.py reformatted.
Verified in a throwaway worktree: TS + Python fixes re-staged into the commit; unfixable ruff error (undefined name) blocks the commit; md-only commit passes; branch without lefthook.yml (main) exits 0 through the shared hook.
Partial staging: unstaged hunks away from reformatted lines are preserved exactly. Known limitation: an unstaged hunk adjacent to lines the formatter rewrites is re-applied at a shifted position (no content loss, nothing unstaged committed, no warning from lefthook).
Docker path: `pnpm install --frozen-lockfile --filter backend` without .git still installs root devDeps incl. lefthook; its postinstall prints a git error (exit 128) but the install exits 0 — a root prepare script would have failed here.
<!-- SECTION:NOTES:END -->
