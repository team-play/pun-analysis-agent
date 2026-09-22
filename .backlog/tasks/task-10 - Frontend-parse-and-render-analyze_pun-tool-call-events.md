---
id: TASK-10
title: 'Frontend: parse and render analyze_pun tool-call events'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-22 10:37'
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
