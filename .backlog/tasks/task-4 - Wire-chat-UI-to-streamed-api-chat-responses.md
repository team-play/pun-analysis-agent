---
id: TASK-4
title: Wire chat UI to streamed /api/chat responses
status: To Do
assignee: []
created_date: '2026-09-16 19:45'
updated_date: '2026-09-16 19:48'
labels: []
dependencies:
  - TASK-3
references:
  - docs/contracts.md
project: frontend
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
React chat UI consumes the Genkit flow stream from /api/chat (docs/contracts.md) and renders pun explanations inline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Chat UI renders streamed tokens incrementally, not just on stream completion
- [ ] #2 A pun explanation from analyze_pun is visually distinguished from plain chat text
<!-- AC:END -->
