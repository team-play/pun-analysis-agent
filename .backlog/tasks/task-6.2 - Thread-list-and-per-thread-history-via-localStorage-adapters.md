---
id: TASK-6.2
title: Thread list and per-thread history via localStorage adapters
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
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implements the RemoteThreadListAdapter and ThreadHistoryAdapter described in docs/design/frontend-design.md's 'Thread list' section, entirely localStorage-backed with no server persistence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 RemoteThreadListAdapter supports list, create, rename, archive, and delete against localStorage
- [ ] #2 A thread is only written to the stored list once its first message is sent (guarded via initialize()), so an empty 'New Chat' never accumulates on reload
- [ ] #3 Sessions always start on a fresh thread on load; no prior thread is auto-resumed
- [ ] #4 Both adapters are unit-tested against a fake/in-memory localStorage per docs/design/frontend-design.md's 'Development & testing' section
<!-- AC:END -->
