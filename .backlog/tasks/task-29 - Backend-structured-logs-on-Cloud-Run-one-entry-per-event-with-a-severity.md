---
id: TASK-29
title: 'Backend: structured logs on Cloud Run, one entry per event with a severity'
status: To Do
assignee:
  - '@yaisiel.torres'
created_date: '2026-09-26 13:45'
labels: []
dependencies: []
references:
  - backend/src/routes/chat.ts
  - backend/src/middleware/app-check.ts
  - backend/src/app.ts
type: bug
project: backend
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Seen while verifying TASK-25's deploy (2026-09-26): in the pun-agent-backend Cloud Run logs, a single failed /api/chat (Gemini 503) shows up as dozens of separate entries, one per line of the pretty-printed error object and stack trace, with no severity. Earlier logger.warn calls appear as WARNING entries with an empty message. So errors are hard to find or filter in Logs Explorer, and severity-based alerting can't work.

Backend logs through Genkit's logger (genkit/logging): routes/chat.ts (logger.error on flow failures, with the upstream detail), middleware/app-check.ts (logger.warn on App Check rejections, with the reason), and app.ts (the APP_CHECK=off warning). Cloud Run treats each stdout/stderr line as its own entry unless the line is a single JSON object, whose severity and message fields it maps to the entry's severity and message.

Keep what those calls deliberately log server-side only: the upstream error detail (TASK-23) and the App Check rejection reason (TASK-25). Local pnpm dev output should stay readable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On Cloud Run, each logger call produces exactly one log entry, including errors with a stack trace
- [ ] #2 Each entry has the right severity (WARNING for App Check rejections and the APP_CHECK=off warning, ERROR for flow failures), and its message is the log call's message
- [ ] #3 Flow-failure entries still include the upstream error detail and the stack trace; App Check rejection entries still include the reason
- [ ] #4 Local pnpm dev logs stay human-readable
- [ ] #5 Tests cover the log format without needing Cloud Run or the network
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
