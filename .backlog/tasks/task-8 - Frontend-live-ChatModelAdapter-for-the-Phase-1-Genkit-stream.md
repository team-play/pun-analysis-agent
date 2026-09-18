---
id: TASK-8
title: 'Frontend: live ChatModelAdapter for the Phase 1 Genkit stream'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-17 23:41'
due_date: '2026-09-21'
labels: []
milestone: m-2
dependencies:
  - TASK-6
  - TASK-7
  - TASK-13
references:
  - docs/design/frontend-design.md
project: frontend
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Genkit isn't one of assistant-ui's built-in framework adapters, so reaching any real Backend — not just the Phase 2 tool-calling one — requires a custom ChatModelAdapter that parses Genkit's stream events into assistant-ui message parts, per docs/design/frontend-design.md's 'Tool-call visibility' section. This is the Phase 1 version: text-only parsing, switched on via the live flag against the Backend Phase 1 proxy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ChatModelAdapter.run() parses Genkit's plain-text stream events into assistant-ui message parts and renders tokens incrementally, not just on stream completion
- [ ] #2 VITE_CHAT_ADAPTER=live points the UI at the deployed Phase 1 Backend and a real conversation completes end-to-end on the Firebase-hosted app
- [ ] #3 Adapter parsing logic is unit-tested against recorded fixture stream events, not a live stream, per docs/design/frontend-design.md's 'Development & testing' section
- [ ] #4 Switching between stub and live leaves all Slice 1 UI (thread list, persistence, theme) unchanged
<!-- AC:END -->
