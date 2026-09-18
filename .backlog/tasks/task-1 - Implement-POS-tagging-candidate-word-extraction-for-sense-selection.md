---
id: TASK-1
title: Implement POS-tagging candidate-word extraction for sense selection
status: To Do
assignee: []
created_date: '2026-09-16 19:45'
updated_date: '2026-09-17 23:41'
due_date: '2026-09-21'
labels:
  - wsd
dependencies: []
references:
  - docs/milestones/milestone-3.md
  - docs/design/sense-selection.md
project: inference
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
First step of the sense-selection pipeline (docs/milestones/milestone-3.md): tag input text and keep only open-class tokens (NOUN, VERB, ADJ) as pun-word candidates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a sentence, returns candidate tokens filtered to NOUN/VERB/ADJ
- [ ] #2 Closed-class function words are excluded
- [ ] #3 Unit tests cover at least one homographic example (e.g. the dough/money case in docs/design/sense-selection.md)
<!-- AC:END -->
