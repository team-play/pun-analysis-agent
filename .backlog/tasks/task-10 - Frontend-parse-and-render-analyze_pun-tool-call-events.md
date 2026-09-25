---
id: TASK-10
title: 'Frontend: parse and render analyze_pun tool-call events'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-24 01:49'
due_date: '2026-09-21'
labels: []
milestone: m-3
dependencies:
  - TASK-8
  - TASK-9
references:
  - docs/design/frontend-design.md
project: frontend
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extends the Phase 1 ChatModelAdapter to also parse tool-call stream events per the finalized shape in docs/contracts.md (sync point 3 per docs/project-spec.md, closed) and docs/design/frontend-design.md's 'Tool-call visibility' section. A pun explanation needs to read as clearly distinct from plain chat text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 assistant-ui shows the analyze_pun call live as it fires and resolves (running to complete)
- [ ] #2 A resolved pun explanation is visually distinguished from plain chat text
- [ ] #3 Adapter's tool-call parsing is unit-tested against recorded fixture events matching the Backend task's documented shape
- [ ] #4 ChatModelAdapter mints a toolCallId on each analyze_pun toolRequest chunk and attaches the next toolResponse chunk's output to that same call, per docs/contracts.md's correlation rule, producing assistant-ui's {type: 'tool-call', toolCallId, toolName, args, result} part shape
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Open contract question found in PR #27's architectural review (2026-09-23), recorded here rather than solved in TASK-8: docs/contracts.md's Phase 2 paragraph shows tool chunks as bare {"content": [...]} and says Backend 'doesn't re-wrap them', but backend/src/routes/chat.ts wraps every chunk as data: {"message": <chunk>}. So in Phase 2, tool chunks would arrive as data: {"message": {"content": [{"toolRequest": ...}]}}, and if the Phase 2 flow forwards Genkit's generate chunks instead of chunk.text, text chunks become objects too. Today's adapter (live-chat-model-adapter.ts: text + event.message) and GenkitFlowEvent's string type would then render '[object Object]' rather than fail loudly. Before implementing: agree the Phase 2 envelope and text-chunk shape with TASK-9 (Backend), update contracts.md's Phase 2 paragraph (contracts.md now marks message: string as Phase 1 only), and widen GenkitFlowEvent to match. Needs the architectural review in DoD #2.

Also from PR #27 review (2026-09-23): frontend/src/lib/chat/message-text.ts's getMessageText keeps only text parts, and live-chat-model-adapter.ts applies it to every message in history on each turn. Once assistant messages carry analyze_pun tool-call parts, resending history this way silently strips the tool call and its result, so Gemini loses that context on the next turn. Revisit this mapping together with the Phase 2 envelope above.
<!-- SECTION:NOTES:END -->
