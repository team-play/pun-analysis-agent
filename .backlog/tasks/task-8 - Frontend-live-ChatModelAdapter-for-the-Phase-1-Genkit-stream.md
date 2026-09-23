---
id: TASK-8
title: 'Frontend: live ChatModelAdapter for the Phase 1 Genkit stream'
status: In Progress
assignee:
  - '@yaisiel.torres'
created_date: '2026-09-17 23:34'
updated_date: '2026-09-23 08:47'
due_date: '2026-09-21'
labels: []
milestone: m-2
dependencies:
  - TASK-6
  - TASK-7
  - TASK-13
references:
  - docs/design/frontend-design.md
project: frontend
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Genkit isn't one of assistant-ui's built-in framework adapters, so reaching any real Backend — not just the Phase 2 tool-calling one — requires a custom ChatModelAdapter that parses Genkit's stream events into assistant-ui message parts, per docs/design/frontend-design.md's 'Tool-call visibility' section. This is the Phase 1 version: text-only parsing, switched on via the live flag against the Backend Phase 1 proxy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ChatModelAdapter.run() parses Genkit's plain-text stream events into assistant-ui message parts and renders tokens incrementally, not just on stream completion
- [ ] #2 VITE_CHAT_ADAPTER=live points the UI at the deployed Phase 1 Backend and a real conversation completes end-to-end on the Firebase-hosted app
- [x] #3 Adapter parsing logic is unit-tested against recorded fixture stream events, not a live stream, per docs/design/frontend-design.md's 'Development & testing' section
- [x] #4 Switching between stub and live leaves all Slice 1 UI (thread list, persistence, theme) unchanged
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Record a real Phase 1 /api/chat stream (success, with multi-byte chars) and a real error-event stream (invalid API key) from the local backend as raw fixtures.
2. genkit-flow-stream.ts: parseGenkitFlowStream(body) async generator. Frames events on the \n\n delimiter with a carry-over buffer, decodes via TextDecoder with {stream:true} (TextDecoderStream hits a TS DOM-lib BufferSource/Uint8Array variance error in pipeThrough; the flag is equivalent), throws on error: events and on a body that ends before result (truncation), cancels the body in finally on any early exit. Hand-rolled rather than genkit/beta/client: that client sends {data: input} (contract says {messages}), decodes without stream:true (garbles split UTF-8), and never checks reader done (infinite loop on truncated streams) -- both reproduced against 1.42.0.
3. live-chat-model-adapter.ts: createLiveChatModelAdapter(chatUrl) -- maps ThreadMessage[] to {messages:[{role,content}]} via a shared getMessageText helper (also reused by the stub), POSTs with the run's abortSignal, throws on non-2xx, yields the running total of message deltas (assistant-ui replaces content per yield), final yield uses result's text.
4. Tests first against the recorded fixtures: every-byte-offset split, one byte per read, error event, truncation (before result and mid-event), unrecognized event, body cancelled on early exit, contract request shape incl. abortSignal pass-through, cumulative + incremental yields, non-2xx; getChatModelAdapter live-branch URL building and missing VITE_BACKEND_URL. Mutation-checked: reintroducing each bug fails the matching tests.
5. get-chat-model-adapter.ts: live -> createLiveChatModelAdapter(new URL('/api/chat', VITE_BACKEND_URL)); required when live. vite-env.d.ts + .env.example updated.
6. Verify AC#4 + rendered output: App tests pass unchanged; Playwright drove the live UI against local backend + real Gemini.
7. AC#2 blocked on TASK-13 (backend not on Cloud Run yet); deploy-frontend.yml untouched until then.
8. Code review subagent; docs drift follow-up commit (local-setup.md:88, frontend-design.md).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented parser + live adapter test-first against real recorded streams. Rendered verification (Playwright, live mode, local backend, real Gemini): 19 distinct on-screen snapshots growing 29->1085 chars (incremental, AC#1), markdown + accents render correctly, thread list/theme unchanged; a real Gemini 503 mid-stream error rendered in assistant-ui's error box. Code review (high) findings: fixed body not cancelled on early exit (+test), added getChatModelAdapter live-branch tests, synced plan. Refuted empirically: 'empty assistant turn after a failed reply breaks later turns' -- Gemini accepted {role:assistant, content:''} via the real backend. Not acted on: payload shape guards in parseEvent (backend error shape is pinned by its express parity test), path-preserving URL join (Cloud Run URLs have no path; contract path is root /api/chat), O(n^2) buffer re-scan (KB-sized events). Follow-up idea: backend forwards Gemini's raw developer-facing error text to users. 35/35 frontend tests, tsc, biome clean. DoD#2 architectural review judged N/A: no contract/topology/dependency change (the Genkit-client option that would have changed the contract was rejected).

Pairing follow-ups: added an adapter test for an error event arriving after message chunks (partial text is yielded before the throw; assistant-ui's local runtime then marks the message incomplete/error and keeps that content), and renamed the 200-then-error test so 'mid-stream' isn't misread as 'after some text'. 36/36 frontend tests, tsc, biome clean. AC #1/#3/#4 checked on the evidence above; AC #2 stays open until TASK-13 deploys the backend. DoD #2 checked as not applicable: no contracts.md, topology, isolation/phase-order, dependency, service, or deploy-target change.
<!-- SECTION:NOTES:END -->
