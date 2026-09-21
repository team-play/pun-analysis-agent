---
id: TASK-2.3
title: Build precision/recall evaluation harness for /analyze
status: To Do
assignee: []
created_date: '2026-09-20 10:05'
updated_date: '2026-09-20 10:15'
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
<!-- AC:END -->
