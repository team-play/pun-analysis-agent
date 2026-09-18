---
id: TASK-5
title: Deploy frontend to Firebase Hosting via CI
status: To Do
assignee: []
created_date: '2026-09-17 23:33'
updated_date: '2026-09-17 23:41'
due_date: '2026-09-21'
labels: []
milestone: m-0
dependencies: []
references:
  - docs/local-setup.md
  - .github/workflows/deploy-frontend.yml
project: frontend
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
deploy-frontend.yml is currently a placeholder (see the comment at the top of the file) — nothing in frontend/ has ever reached Firebase Hosting. Getting this pipeline working against whatever's currently in frontend/ (even the Vite starter) proves the CI/CD path end-to-end before any real UI work lands, so every later frontend slice ships automatically instead of needing its own deploy work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pushing to main with a change under frontend/** builds the Vite app and deploys the build output to Firebase Hosting
- [ ] #2 Required Firebase secrets/config for the deploy step are documented in docs/local-setup.md
- [ ] #3 A push that only touches backend/ or inference/ does not trigger this workflow
- [ ] #4 The deployed Hosting URL is reachable and serves the current frontend/ build
<!-- AC:END -->
