---
id: TASK-6.3
title: StubChatModelAdapter with Phase 1 and Phase 2 fixtures
status: To Do
assignee: []
created_date: '2026-09-17 23:33'
updated_date: '2026-09-17 23:41'
due_date: '2026-09-21'
labels: []
milestone: m-1
dependencies: []
references:
  - docs/design/frontend-design.md
parent_task_id: TASK-6
project: frontend
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The seam that lets Frontend build/test without a live Backend, per docs/engineering-practices.md's isolation rule and docs/design/frontend-design.md's 'Development & testing' section. CI and unit tests always use this stub.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 StubChatModelAdapter implements the same run() interface as the real ChatModelAdapter and returns canned streamed responses
- [ ] #2 At least two fixtures exist: a plain-text-only stream (Phase 1 shape) and a text-plus-tool-call stream (Phase 2 shape)
- [ ] #3 A build-time env flag (e.g. VITE_CHAT_ADAPTER=stub|live) selects the stub in local dev and CI by default
- [ ] #4 Component tests (greeting-to-chat transition, message rendering, loading/error states) run against the stub in CI with no network access
<!-- AC:END -->
