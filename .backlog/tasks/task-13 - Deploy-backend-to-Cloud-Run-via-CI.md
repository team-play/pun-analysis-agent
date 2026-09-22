---
id: TASK-13
title: Deploy backend to Cloud Run via CI
status: To Do
assignee: []
created_date: '2026-09-17 23:40'
updated_date: '2026-09-22 10:37'
due_date: '2026-09-21'
labels: []
milestone: m-2
dependencies: []
references:
  - docs/local-setup.md
  - .github/workflows/deploy-backend.yml
  - docs/project-spec.md
project: backend
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
deploy-backend.yml is currently a placeholder, identical in structure to deploy-frontend.yml (see the comment at the top of the file) — nothing in backend/ has ever reached Cloud Run. Slice 2's milestone claims a Backend 'live on Cloud Run,' and TASK-8's live-adapter work needs a real Backend URL to point at, but neither TASK-7 (the Gemini proxy code) nor anything else actually stands up the Cloud Run service. This task closes that gap: Dockerfile, Cloud Run service config, and the CI deploy step, independent of what TASK-7 implements inside the app.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pushing to main with a change under backend/** builds the container and deploys it to Cloud Run
- [ ] #2 The Cloud Billing account / card-on-file requirement from docs/project-spec.md's stack notes is satisfied for the shared GCP project (or confirmed already satisfied)
- [ ] #3 Required secrets (Gemini API key, GCP credentials) are documented in docs/local-setup.md and consumed from GitHub Secrets, per docs/local-setup.md's existing note on where those live
- [ ] #4 The deployed Cloud Run URL responds on whatever backend/ currently exposes (e.g. /health), even before TASK-7's /api/chat route lands
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
