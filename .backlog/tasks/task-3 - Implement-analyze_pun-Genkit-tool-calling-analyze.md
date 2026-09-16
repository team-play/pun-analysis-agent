---
id: TASK-3
title: Implement analyze_pun Genkit tool calling /analyze
status: To Do
assignee: []
created_date: '2026-09-16 19:45'
updated_date: '2026-09-16 19:48'
labels: []
dependencies:
  - TASK-1
references:
  - docs/contracts.md
project: backend
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Genkit tool that lets the chat flow call Inference's /analyze when a message needs pun analysis, per docs/contracts.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tool request/response match the /analyze schema in docs/contracts.md exactly
- [ ] #2 Non-2xx or malformed Inference responses don't crash the chat flow
<!-- AC:END -->
