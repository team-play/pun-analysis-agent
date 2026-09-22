---
id: TASK-14
title: Deploy inference to Cloud Run via CI
status: To Do
assignee: []
created_date: '2026-09-17 23:40'
updated_date: '2026-09-22 10:37'
due_date: '2026-09-21'
labels: []
milestone: m-4
dependencies: []
references:
  - docs/local-setup.md
  - .github/workflows/deploy-inference.yml
  - docs/project-spec.md
project: inference
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
deploy-inference.yml is currently a placeholder, identical in structure to deploy-frontend.yml — nothing in inference/ has ever reached Cloud Run. Slice 4's milestone and TASK-11 both assume a 'deployed Inference Cloud Run /analyze endpoint' exists to swap in, but nothing stands that service up. This task closes that gap: Dockerfile, Cloud Run service config, and the CI deploy step, independent of the classifier/WSD work tracked separately (TASK-1 and the untracked detection/sense-selection work noted on TASK-11).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pushing to main with a change under inference/** builds the container and deploys it to Cloud Run
- [ ] #2 The Cloud Billing account / card-on-file requirement from docs/project-spec.md's stack notes is satisfied for the shared GCP project (or confirmed already satisfied)
- [ ] #3 Required secrets/config are documented in docs/local-setup.md and consumed from GitHub Secrets
- [ ] #4 The deployed Cloud Run URL responds on whatever inference/ currently exposes, even before the real classifier/WSD logic lands
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
