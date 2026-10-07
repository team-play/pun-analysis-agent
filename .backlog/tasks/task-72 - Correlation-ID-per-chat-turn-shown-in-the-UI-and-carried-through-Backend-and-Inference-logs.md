---
id: TASK-72
title: >-
  Correlation ID per chat turn, shown in the UI and carried through Backend and
  Inference logs
status: To Do
assignee:
  - '@yaitorr'
created_date: '2026-10-07 09:28'
updated_date: '2026-10-07 09:31'
labels: []
dependencies: []
references:
  - docs/contracts.md
  - backend/src/logging.ts
  - backend/src/tools/analyze-pun.ts
  - frontend/src/lib/chat/export-thread.ts
priority: medium
type: feature
project: backend
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nothing ties what a user sees in the UI to the log lines that produced it. No request, trace or correlation id exists anywhere in `frontend/`, `backend/`, `inference/` or `docs/contracts.md`. On 2026-10-07 a chat export (Frontend thread export) showed an unexpected sense_source llm_fallback for "The baker needs more dough.". Confirming why meant reproducing the request locally, because there was no way to find that turn in the Backend or Inference logs (see TASK-71 for the cause). One id per chat turn, visible in the UI and in the export, lets anyone go from a reply they are looking at to the matching Backend and Inference log entries.

The id crosses all three packages and adds to the `/api/chat` contract (and probably `/analyze` request headers), so `docs/contracts.md` changes and the architectural review in AGENTS.md applies. Project is set to backend because Backend issues the id and owns the chat flow. Frontend and Inference changes are part of this task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every `/api/chat` turn gets one correlation id, and every Backend log line written while handling that turn includes it
- [ ] #2 Backend sends the id with each `/analyze` call; Inference includes it on its log lines for that request, including the llm_fallback log line, and `/analyze` still works when no id is sent
- [ ] #3 The UI shows the id on each assistant reply in a form that is easy to copy, and the thread export includes each reply id
- [ ] #4 The id is generated, not derived from user text, and is never written into Gemini prompts
- [ ] #5 `docs/contracts.md` documents where the id appears in `/api/chat` and `/analyze`, and tests on each side fail if the id is dropped between Frontend, Backend and Inference
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
