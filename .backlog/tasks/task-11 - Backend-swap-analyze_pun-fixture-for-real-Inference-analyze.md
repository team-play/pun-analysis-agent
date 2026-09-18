---
id: TASK-11
title: 'Backend: swap analyze_pun fixture for real Inference /analyze'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-17 23:41'
due_date: '2026-09-21'
labels: []
milestone: m-4
dependencies:
  - TASK-9
  - TASK-1
  - TASK-14
references:
  - docs/contracts.md
  - docs/project-spec.md
project: backend
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-9 deliberately calls Inference through an injectable client backed by a fixture so Backend/Frontend Phase 2 work isn't blocked on Inference's ML readiness. Once Inference's real /analyze endpoint is deployed to Cloud Run (TASK-14), this swaps the fixture client for the real HTTP call. Depends on TASK-9, TASK-14, and TASK-1's sense-selection candidate extraction; Data/Eval's dataset work (TASK-2) is parallel, not a hard blocker. Known gap: per docs/milestones/milestone-3.md's domain table, a working /analyze also needs the separate 'Inference — Detection' classifier workstream (pun_type, currently untracked) and sense-selection steps 2-6 from docs/design/sense-selection.md (WordNet retrieval, dependency-parse context, selectional-preference scoring, explanation templating) beyond TASK-1's POS-tagging step — none of these are tracked as tasks yet, so this task is blocked in practice on work this backlog doesn't yet capture, not just on TASK-1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 analyze_pun's injectable client calls the deployed Inference Cloud Run /analyze endpoint instead of the fixture
- [ ] #2 An end-to-end conversation on the Firebase-hosted frontend returns real is_pun/pun_type/explanation/confidence/sense_source values, not fixture data
- [ ] #3 A timeout/fallback exists for a cold-started Inference request, per docs/project-spec.md's Cloud Run cold-start caveat
- [ ] #4 TASK-9's fixture-based tests still pass unchanged; only the default runtime client changes
<!-- AC:END -->
