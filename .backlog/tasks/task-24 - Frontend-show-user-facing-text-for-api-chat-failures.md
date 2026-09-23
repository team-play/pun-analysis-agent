---
id: TASK-24
title: 'Frontend: show user-facing text for /api/chat failures'
status: Done
assignee:
  - '@yaisiel.torres'
created_date: '2026-09-23 08:56'
updated_date: '2026-09-23 09:17'
labels: []
milestone: m-2
dependencies:
  - TASK-23
references:
  - frontend/src/lib/chat/genkit-flow-stream.ts
  - frontend/src/lib/chat/live-chat-model-adapter.ts
type: bug
project: frontend
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The chat's error box shows developer-facing text for every way a live reply can fail. Found during TASK-8, where the live adapter was built.

There are three sources, all in frontend/src/lib/chat:
- genkit-flow-stream.ts renders the Backend's error event as '${status}: ${message}'. The Genkit status code (e.g. UNAVAILABLE) is useful for debugging but means nothing to users.
- live-chat-model-adapter.ts reports a non-2xx response as '/api/chat returned <status>: <raw response body>'.
- genkit-flow-stream.ts reports a stream cut off before its result event as 'The /api/chat stream ended before its final result — the reply was cut off.'

Depends on TASK-23: that task makes the Backend's error-event message itself user-facing. Until then, dropping the status prefix would just show Gemini's raw upstream message without its code. The wording of the two Frontend-originated failures (non-2xx, truncation) is Frontend's to own either way.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An error event from /api/chat shows only its message in the chat's error box, without the Genkit status-code prefix
- [x] #2 A non-2xx /api/chat response and a stream cut off before its result each show a short user-facing sentence rather than a raw response body or internal wording
- [x] #3 Adapter/parser tests pin the user-visible text for all three failure paths (error event, non-2xx, cut-off stream)
- [x] #4 Each failure path's rendered error box is checked in the running UI, not just in unit tests
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. genkit-flow-stream.ts stays developer-level: Backend's error event throws a FlowErrorEvent carrying its user-facing message (no status prefix, per contracts.md 'Failed replies'); an error event without a message, an unrecognized event, or a body ending before result throw plain developer Errors.
2. live-chat-model-adapter.ts has one failure boundary (failWith): anything failing before a response arrives (fetch rejects, non-2xx, unreadable body) shows 'Couldn't get a reply', anything failing mid-reply except a FlowErrorEvent (dropped connection, garbled event, missing result) shows 'cut off'; the real cause goes to console.error. FlowErrorEvents pass through as-is, and aborts are rethrown untouched so assistant-ui shows a cancel.
3. Re-record fixtures/recorded-genkit-streams.ts's recordedErrorStream from the TASK-23 backend (real invalid-key failure).
4. Tests pin the exact user-visible text per path and mutation-check the pass-throughs.
5. Rendered check with Playwright for every path (backend down for real; other paths by route interception, the error event using the real recording).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
First pass put user-facing text at each throw site; code review (high) showed that left fetch rejections ('Failed to fetch'), mid-reply connection drops and garbled events leaking raw browser text, so the mapping moved to a single boundary in the adapter (parser now only distinguishes Backend's error event via FlowErrorEvent). Also fixed from review: rejected response.text() on non-2xx, error event without a message, non-2xx wording ('couldn't be sent' was inaccurate for 5xx). Not acted on: exporting the strings for tests (tests pin literal text on purpose, AC #3), the stub's dev-facing failure text (dev tool, out of scope), backend skipping the log on a failure concurrent with a disconnect (rare; TASK-23 code; quota errors recur on the next request). Rendered check (Playwright, live mode): backend down -> 'Couldn't get a reply', 500 -> same, recorded error event after a chunk -> 'Something went wrong. Please try again.' with the partial text kept, missing result and garbled event -> 'cut off' with partial text kept; all developer details in the console. Earlier run also showed a real Gemini 503 through the TASK-23 backend as 'The assistant is busy right now...' with no status prefix. 42/42 frontend tests, tsc, biome clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The chat's error box now only ever shows user-facing text: Backend's error-event message as-is (no Genkit status prefix), 'Couldn't get a reply' for anything failing before a response (offline, Backend down, non-2xx), and 'cut off' for anything failing mid-reply (dropped connection, garbled or missing events), with partial text kept and the real cause logged to the console; aborts still show as a cancel. Verified with 42 frontend tests pinning each path's exact text (mutation-checked), and Playwright renders of every path in the live UI, including a real Gemini 503 through the TASK-23 backend. Code review done; no architectural change (consumes TASK-23's documented contract).
<!-- SECTION:FINAL_SUMMARY:END -->
