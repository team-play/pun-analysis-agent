---
id: TASK-2.3
title: Build precision/recall evaluation harness for /analyze
status: To Do
assignee: []
created_date: '2026-09-20 10:05'
updated_date: '2026-09-23 10:44'
labels:
  - dataset
  - evaluation
milestone: m-6
dependencies:
  - TASK-9
  - TASK-16
references:
  - docs/contracts.md
parent_task_id: TASK-2
project: eval
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Milestone-3.md assigns Data/Eval 'precision/recall on detection' as an ongoing responsibility once Inference has something to evaluate. Build the harness that runs the eval dataset through /analyze and scores it, respecting TASK-2.1's fix that pun_type is only meaningful (non-null) on is_pun:true rows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Harness calls /analyze for each dataset row via TASK-9's injectable client pattern and records is_pun/pun_type predictions
- [ ] #2 Harness reports precision/recall for is_pun detection, and separately for pun_type classification restricted to true-positive pun rows
- [ ] #3 Harness is runnable via a documented command in eval/README.md
- [ ] #4 Undetermined predictions (is_pun: null, per docs/contracts.md) are counted and reported separately as coverage, never silently scored as non-puns
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Open decisions for Eval (raised by the 2026-09-23 /analyze contract change, for Prateek): (1) compute is_pun precision/recall over determined rows only and report coverage separately, or count undetermined as a miss? (2) an HTTP/transport error from /analyze is a failed run, not an undetermined prediction; the harness calls /analyze directly, so it must not copy Backend's 'error becomes undetermined' mapping even though AC #1 follows TASK-9's client pattern.
<!-- SECTION:NOTES:END -->
