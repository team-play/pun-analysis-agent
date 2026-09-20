---
id: TASK-2.4
title: Calibrate sense-selection margin threshold against SemEval homographic subset
status: To Do
assignee: []
created_date: '2026-09-20 10:05'
labels:
  - wsd
  - evaluation
dependencies:
  - TASK-1
  - TASK-19
references:
  - docs/design/sense-selection.md
parent_task_id: TASK-2
project: eval
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
docs/design/sense-selection.md leaves the Tier 1 margin threshold (when two candidate senses count as close enough to signal a pun) unset until Eval runs it against real data. Use the eval dataset's homographic, is_pun:true rows to calibrate that threshold once TASK-19's scoring exists.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Margin threshold is calibrated against the homographic/is_pun:true subset of the eval dataset
- [ ] #2 The chosen threshold and calibration methodology are recorded in docs/design/sense-selection.md's open questions section
<!-- AC:END -->
