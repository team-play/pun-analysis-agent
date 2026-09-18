---
id: TASK-6
title: Chat UI built against a stub adapter (backend-independent)
status: To Do
assignee: []
created_date: '2026-09-17 23:33'
updated_date: '2026-09-17 23:41'
due_date: '2026-09-21'
labels: []
milestone: m-1
dependencies:
  - TASK-5
project: frontend
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Per docs/design/frontend-design.md and docs/engineering-practices.md's isolation rule, Frontend must be fully buildable and demoable with no Backend running. This is the full chat experience — greeting/chat transition, composer, thread list, persistence — built entirely against a StubChatModelAdapter, deployable via Slice 0's pipeline and demoable before any real Backend exists.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The full chat UI (greeting, composer, streaming render off the stub, thread list) is live on Firebase Hosting via the Slice 0 pipeline
- [ ] #2 The deployed app is fully usable end-to-end with zero real Backend, Inference, or Gemini quota involved
<!-- AC:END -->
