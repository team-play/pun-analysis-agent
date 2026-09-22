---
id: TASK-2.3
title: Build precision/recall evaluation harness for /analyze
status: To Do
assignee:
  - Livia
created_date: '2026-09-20 10:05'
updated_date: '2026-09-22 16:53'
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
- [x] #2 Harness reports precision/recall for is_pun detection, and separately for pun_type classification restricted to true-positive pun rows
- [x] #3 Harness is runnable via a documented command in eval/README.md
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Addressed an adversarial code review before finalizing: extracted slice_report as a module-level _slice_report function for testability, fixed a misleading is_pun validation error message, and documented fixture_analyzer's words_involved as a contract-shape placeholder (not a real prediction). Expanded eval/tests/test_evaluate_dataset.py from 9 to 21 tests, adding coverage the review flagged as missing: HTTP failure modes for analyze_endpoint (HTTPError/URLError/TimeoutError/invalid JSON), fixture_analyzer contract correctness, empty food_baseline slice (zero-row division-by-zero safety), animal/food category inclusion, malformed CSV rows (missing required column, unparseable is_pun), and main()/parse_args CLI behavior (exit codes, --output writing). Re-verified the fixture-mode self-validation numbers are unchanged after the refactor (4,030/4,030 rows, 0 errors). uv run ruff check . passes with zero findings.
<!-- SECTION:NOTES:END -->
