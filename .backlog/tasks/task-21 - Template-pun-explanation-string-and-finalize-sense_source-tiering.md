---
id: TASK-21
title: Template pun explanation string and finalize sense_source tiering
status: To Do
assignee: []
created_date: '2026-09-20 10:04'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-19
  - TASK-20
references:
  - docs/design/sense-selection.md
  - docs/contracts.md
project: inference
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Step 6 of docs/design/sense-selection.md's approach: once TASK-19 or TASK-20 has produced a winning sense pair, template the /analyze explanation field per the design doc's pattern ("{word}" can mean {gloss_1} or {gloss_2}; the sentence supports both because {evidence}), and make sure sense_source reflects whichever tier actually won end-to-end.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a winning sense pair, explanation is templated per docs/design/sense-selection.md's pattern
- [ ] #2 sense_source in the /analyze response matches whichever tier (wordnet/wiktionary/llm_fallback) actually produced the winning senses, or null on graceful failure
- [ ] #3 Unit tests cover the dough/money example end-to-end producing the exact explanation shape
<!-- AC:END -->
