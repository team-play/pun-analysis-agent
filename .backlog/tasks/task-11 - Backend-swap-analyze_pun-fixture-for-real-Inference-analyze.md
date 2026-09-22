---
id: TASK-11
title: 'Backend: swap analyze_pun fixture for real Inference /analyze'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-22 10:37'
due_date: '2026-09-21'
labels: []
milestone: m-4
dependencies:
  - TASK-1
  - TASK-9
  - TASK-14
  - TASK-16
  - TASK-21
references:
  - docs/contracts.md
  - docs/project-spec.md
project: backend
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-9 deliberately calls Inference through an injectable client backed by a fixture so Backend/Frontend Phase 2 work isn't blocked on Inference's ML readiness. Once Inference's real /analyze endpoint is deployed to Cloud Run (TASK-14), this swaps the fixture client for the real HTTP call. Depends on TASK-9, TASK-14, and the milestone m-6 Inference-quality chain: TASK-1's candidate extraction, TASK-16's Detection classifier, and TASK-21 (which transitively pulls in TASK-17-20's sense-selection steps 2-6). Data/Eval's dataset work (TASK-2) is parallel, not a hard blocker.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 analyze_pun's injectable client calls the deployed Inference Cloud Run /analyze endpoint instead of the fixture
- [ ] #2 An end-to-end conversation on the Firebase-hosted frontend returns real is_pun/pun_type/explanation/confidence/sense_source values, not fixture data
- [ ] #3 A timeout/fallback exists for a cold-started Inference request, per docs/project-spec.md's Cloud Run cold-start caveat
- [ ] #4 TASK-9's fixture-based tests still pass unchanged; only the default runtime client changes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
