---
id: TASK-63
title: >-
  Sense selection: when a filter rejects a candidate's pair, try its next
  distinct sense
status: To Do
assignee:
  - '@Andi-Cast'
created_date: '2026-10-05 17:47'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-21
priority: low
project: inference
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From TASK-58's code review (noted on TASK-21): in inference/selection.py, pun_readings() skips the whole candidate when the shared-WordNet-word or gloss-similarity filter rejects its top pair, instead of trying the next distinct sense as runner-up. So a word whose second sense is a near-synonym but whose third sense would make a real pun falls through to the next candidate or to llm_fallback. These are really "distinct sense" rules, so folding them into scoring's pun_margin/_distinct would let the runner-up search continue. Kept out of TASK-21 because it changes which pairs pass, so the MARGIN_THRESHOLD that TASK-2.4 calibrated on the current behaviour has to be re-measured.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When the shared-word or gloss-similarity filter rejects a candidate's pair, the next distinct sense is tried as runner-up before the candidate is skipped
- [ ] #2 A unit test with a word whose second sense is rejected but whose third passes fails without the change
- [ ] #3 scripts/calibrate_margin.py is re-run on the changed pipeline, and MARGIN_THRESHOLD is kept or updated with the new numbers recorded in docs/design/sense-selection.md
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
