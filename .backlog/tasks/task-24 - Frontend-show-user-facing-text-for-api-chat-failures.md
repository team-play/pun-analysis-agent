---
id: TASK-24
title: 'Frontend: show user-facing text for /api/chat failures'
status: To Do
assignee: []
created_date: '2026-09-23 08:56'
labels: []
milestone: m-2
dependencies:
  - TASK-23
references:
  - frontend/src/lib/chat/genkit-flow-stream.ts
  - frontend/src/lib/chat/live-chat-model-adapter.ts
type: bug
project: frontend
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The chat's error box shows developer-facing text for every way a live reply can fail. Found during TASK-8, where the live adapter was built.

There are three sources, all in frontend/src/lib/chat:
- genkit-flow-stream.ts renders the Backend's error event as '${status}: ${message}'. The Genkit status code (e.g. UNAVAILABLE) is useful for debugging but means nothing to users.
- live-chat-model-adapter.ts reports a non-2xx response as '/api/chat returned <status>: <raw response body>'.
- genkit-flow-stream.ts reports a stream cut off before its result event as 'The /api/chat stream ended before its final result — the reply was cut off.'

Depends on TASK-23: that task makes the Backend's error-event message itself user-facing. Until then, dropping the status prefix would just show Gemini's raw upstream message without its code. The wording of the two Frontend-originated failures (non-2xx, truncation) is Frontend's to own either way.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An error event from /api/chat shows only its message in the chat's error box, without the Genkit status-code prefix
- [ ] #2 A non-2xx /api/chat response and a stream cut off before its result each show a short user-facing sentence rather than a raw response body or internal wording
- [ ] #3 Adapter/parser tests pin the user-visible text for all three failure paths (error event, non-2xx, cut-off stream)
- [ ] #4 Each failure path's rendered error box is checked in the running UI, not just in unit tests
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
