---
id: TASK-27
title: 'Frontend CI: redeploy on dependency changes, serialize deploys, build on PRs'
status: To Do
assignee:
  - '@yaisiel.torres'
created_date: '2026-09-25 02:01'
labels: []
dependencies: []
references:
  - .github/workflows/deploy-frontend.yml
  - .github/workflows/deploy-backend.yml
  - .github/workflows/test.yml
type: chore
project: frontend
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in TASK-8's code review (2026-09-24), when the deployed frontend switched to the live adapter. deploy-frontend.yml lags deploy-backend.yml in three ways, and the gaps now matter more because a bad or stale frontend deploy breaks real chat, not just a stub demo. Its paths filter misses the root package.json, pnpm-lock.yaml and pnpm-workspace.yaml, so a frontend-only dependency bump redeploys the backend but not the frontend. It has no concurrency group, so two quick pushes to main can finish out of order and leave the older build live, and no workflow_dispatch, so a redeploy needs a commit. And nothing builds the frontend (tsc -b && vite build) on pull requests: test.yml runs only vitest, so a type or build error first shows up as a failed deploy on main. deploy-backend.yml (TASK-13) already has the pattern to copy for the first two.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A change to the root package.json, pnpm-lock.yaml or pnpm-workspace.yaml on main triggers deploy-frontend.yml
- [ ] #2 Frontend deploys are serialized by a concurrency group, and a manual workflow_dispatch run deploys main only
- [ ] #3 Pull requests touching frontend/ run the production build (pnpm --filter frontend run build) with VITE_CHAT_ADAPTER unset, and fail on type or build errors
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
