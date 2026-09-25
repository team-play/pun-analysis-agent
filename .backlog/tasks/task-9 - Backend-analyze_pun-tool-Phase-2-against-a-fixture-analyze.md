---
id: TASK-9
title: 'Backend: analyze_pun tool (Phase 2) against a fixture /analyze'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-24 01:55'
due_date: '2026-09-21'
labels: []
milestone: m-3
dependencies:
  - TASK-7
references:
  - docs/contracts.md
  - docs/project-spec.md
  - docs/engineering-practices.md
project: backend
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Per docs/engineering-practices.md's Phase 2 plan: implement the analyze_pun tool definition and the tool_use -> tool-result round trip from docs/project-spec.md's architecture diagram. Calls Inference through an injectable client so it can run against a fixture matching docs/contracts.md's /analyze schema until Inference's real endpoint is live. Also defines the tool-call event shape within the /api/chat stream, which is sync point 3 in docs/project-spec.md and currently unspecified in docs/contracts.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 analyze_pun tool request/response match the /analyze schema in docs/contracts.md exactly
- [ ] #2 Inference is called through an injectable client; tests substitute a fixture /analyze response instead of a live HTTP call
- [ ] #3 Non-2xx or malformed Inference responses don't crash the chat flow — the tool degrades to a well-formed low-confidence result or a plain conversational reply
- [ ] #4 The tool-call event shape (toolRequest/toolResponse chunks, toolCallId correlation rule) is implemented exactly as finalized in docs/contracts.md, closing sync point 3
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From PR #28 review (2026-09-23): backend/src/routes/chat.ts's toUserFacingError maps errors to user-facing text by GenkitError.status only, so it doesn't recognize Genkit's UserFacingError (a GenkitError subclass, @genkit-ai/core/lib/error.js). If this task's tool code ever throws one, its intended message is replaced by the status-based text (usually 'Something went wrong'). Nothing throws one today. If you add one, pass it through in toUserFacingError using err.originalMessage (err.message is prefixed with the status, e.g. 'INVALID_ARGUMENT: ...'), and add a route test. AC #3 already prefers degrading to a well-formed result over failing the turn, so this should only matter for errors that really must end the turn.
<!-- SECTION:NOTES:END -->
