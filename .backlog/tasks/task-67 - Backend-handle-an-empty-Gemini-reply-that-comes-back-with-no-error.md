---
id: TASK-67
title: 'Backend: handle an empty Gemini reply that comes back with no error'
status: To Do
assignee: []
created_date: '2026-10-06 01:10'
labels: []
dependencies: []
references:
  - backend/src/flows/chat.ts
  - backend/src/flows/model-ladder.ts
  - docs/contracts.md
  - docs/experiments/task-56/README.md
priority: low
project: backend
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
During TASK-56's live check on 2026-10-06 (docs/experiments/task-56/runs/2026-10-06T00-55-24.539Z.json, results index 15), gemini-3.1-flash-lite at its production thinking level (MEDIUM, GEMINI_MODEL_CONFIG in backend/src/config.ts) answered 'Is this a pun? The nudist defended himself by citing his Constitutional right to bare arms.' with an empty reply: no text, no analyze_pun call and no error. createChatFlow (backend/src/flows/chat.ts) returned "" as the result, so in production the user would see a blank message from Otto with nothing to retry. It happened once in 30 replies in that run and not at all in the next run of 30, so it's rare. The cause (thought-only output, an empty candidate, a finishReason Backend ignores) is not yet known.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The cause of an empty reply with no error is identified (e.g. Gemini's finishReason or a thought-only response) and recorded in the task notes
- [ ] #2 Backend no longer streams an empty result as a finished reply: it is either retried or stepped down through modelLadder or reported as an error event per docs/contracts.md
- [ ] #3 A Backend test with Genkit's mock model returning an empty response fails without the fix and passes with it
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
