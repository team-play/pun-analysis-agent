---
id: TASK-13
title: Deploy backend to Cloud Run via CI
status: In Progress
assignee:
  - '@yaisiel.torres'
created_date: '2026-09-17 23:40'
updated_date: '2026-09-23 09:54'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Key decisions (2026-09-23, with @yaisiel.torres): the Cloud Run service gets its own new Gemini API key, created in the AI Studio project gen-lang-client-0125403786 (display name 'pun-agent', billing OFF), not in the GCP project pun-agent (billing ON, required by Cloud Run). Reason: with billing off the key stays on Gemini's free tier, so abuse of the public /api/chat can only exhaust quota, never charge the card (the abuse hole itself is TASK-25, Firebase App Check). Known trade-off: free-tier limits are per project, so production shares quota with local-dev keys in that project (pun-agent-local). Own key rather than reusing the existing 'pun-agent' key, so it can be revoked without breaking local dev. The key is stored in Secret Manager in pun-agent and read by a dedicated least-privilege runtime service account (not the default compute SA, which has Editor).
<!-- SECTION:NOTES:END -->
