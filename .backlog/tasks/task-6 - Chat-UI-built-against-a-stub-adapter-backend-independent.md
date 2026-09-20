---
id: TASK-6
title: Chat UI built against a stub adapter (backend-independent)
status: In Progress
assignee:
  - '@yaisiel.torres'
created_date: '2026-09-17 23:33'
updated_date: '2026-09-20 10:45'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Executed as three subtasks, in dependency order 6.3 -> 6.2 -> 6.1 (each has its own detailed plan/notes/AC verification):
1. TASK-6.3: StubChatModelAdapter + Phase 1/Phase 2 fixtures + VITE_CHAT_ADAPTER flag.
2. TASK-6.2: localStorage-backed RemoteThreadListAdapter/ThreadHistoryAdapter (wrapping assistant-ui's built-in createLocalStorageAdapter rather than a hand-rolled one).
3. TASK-6.1: assistant-ui's pre-styled Thread + ThreadListSidebar (via shadcn/Tailwind v4 registry), retheme toward the Claude-inspired/Purdue-gold palette, greeting<->chat shell, header.
4. Wire everything into App.tsx, replace the Vite starter test with real component tests, run lint/build/test, then verify AC#1/#2 by confirming the Slice 0 CI pipeline deploys this build to Firebase Hosting with zero backend calls.
<!-- SECTION:PLAN:END -->
