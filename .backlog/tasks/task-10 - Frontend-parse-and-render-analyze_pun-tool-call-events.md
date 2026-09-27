---
id: TASK-10
title: 'Frontend: parse and render analyze_pun tool-call events'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-27 15:40'
due_date: '2026-09-21'
labels: []
milestone: m-3
dependencies:
  - TASK-8
references:
  - docs/design/frontend-design.md
project: frontend
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extends the Phase 1 ChatModelAdapter to also parse tool-call stream events per the finalized shape in docs/contracts.md (sync point 3 per docs/project-spec.md, closed) and docs/design/frontend-design.md's 'Tool-call visibility' section. A pun explanation needs to read as clearly distinct from plain chat text.

Error scope: failures of /api/chat itself (network, non-2xx, quota and other Backend error events, cut-off streams, user stop) already show user-facing text via TASK-24; this task only covers how those failures settle an in-flight analyze_pun call. Inference failures and timeouts never reach Frontend as errors: Backend returns the undetermined result instead (TASK-9 AC #4), rendered per AC #6.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 assistant-ui shows the analyze_pun call live as it fires and resolves (running to complete)
- [ ] #2 A resolved pun explanation is visually distinguished from plain chat text
- [ ] #3 Adapter's tool-call parsing is unit-tested against recorded fixture events matching the Backend task's documented shape
- [ ] #4 ChatModelAdapter creates one assistant-ui {type: 'tool-call', toolCallId, toolName, args, result} part per analyze_pun toolRequest part (a chunk can hold several) and sets its result from the toolResponse part with the same ref, per docs/contracts.md's pairing rule; unit-tested with parallel calls whose results arrive in the opposite order
- [ ] #5 An llm_fallback result (empty explanation) renders as senses supplied by Gemini at lower confidence, backed by a stub fixture
- [ ] #6 An undetermined result (is_pun: null) renders as 'Inference couldn't analyze this' with no confidence shown, checked with an explicit is_pun === null test (a truthiness check would show it as 'not a pun'), backed by a stub fixture; tool results are typed with a shared AnalyzeResult type (is_pun: boolean | null, confidence: number | null) so the compiler catches unhandled nulls
- [ ] #7 A turn that ends after an analyze_pun toolRequest but before its toolResponse never leaves the call running: a Backend error event, dropped connection or missing result settles it as failed ('couldn't finish'), and a user stop settles it as cancelled; TASK-24's error box and wording are unchanged. Unit-tested with fixture streams that end right after a toolRequest, and each case checked in the running UI
- [ ] #8 A slow analyze_pun stays visibly running with no Frontend timeout of its own; the wait is bounded by Backend's Inference timeout (INFERENCE_TIMEOUT_MS per call, set from a measured cold start by TASK-32 and recorded in docs/contracts.md)
- [ ] #9 The stream parser accepts both a plain-string message and a Genkit-chunk message (docs/contracts.md's Phase 2 shape), and this task deploys before TASK-9 merges, so the live site never receives tool chunks it can't render
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Open contract question found in PR #27's architectural review (2026-09-23), recorded here rather than solved in TASK-8: docs/contracts.md's Phase 2 paragraph shows tool chunks as bare {"content": [...]} and says Backend 'doesn't re-wrap them', but backend/src/routes/chat.ts wraps every chunk as data: {"message": <chunk>}. So in Phase 2, tool chunks would arrive as data: {"message": {"content": [{"toolRequest": ...}]}}, and if the Phase 2 flow forwards Genkit's generate chunks instead of chunk.text, text chunks become objects too. Today's adapter (live-chat-model-adapter.ts: text + event.message) and GenkitFlowEvent's string type would then render '[object Object]' rather than fail loudly. Before implementing: agree the Phase 2 envelope and text-chunk shape with TASK-9 (Backend), update contracts.md's Phase 2 paragraph (contracts.md now marks message: string as Phase 1 only), and widen GenkitFlowEvent to match. Needs the architectural review in DoD #2.
Resolved in TASK-9 (2026-09-27): contracts.md now specifies the Phase 2 envelope. Text chunks stay data: {"message": string}; tool chunks are data: {"message": <Genkit chunk>}; result is the complete reply text; calls and results pair by ref, which Backend guarantees.

Also from PR #27 review (2026-09-23): frontend/src/lib/chat/message-text.ts's getMessageText keeps only text parts, and live-chat-model-adapter.ts applies it to every message in history on each turn. Once assistant messages carry analyze_pun tool-call parts, resending history this way silently strips the tool call and its result, so Gemini loses that context on the next turn. Revisit this mapping together with the Phase 2 envelope above.

Deploy order (2026-09-27, decided with @yaisiel.torres in TASK-9; supersedes the 2026-09-24 'accepted' note and the note to branch on TASK-9): consumer first. Build this task on main against docs/contracts.md (it needs only the contract and its own stub fixtures, not TASK-9's code). Make the parser accept both string and object messages, merge and deploy this task first, then merge TASK-9 (held until then). Browser tabs opened before this deploy keep the Phase 1 bundle until reloaded; that is an accepted transient. See engineering-practices.md's note on deploying contract changes consumer first.

Until TASK-11, production's analyze_pun always returns the undetermined result (is_pun: null), so on the live site every tool call renders per AC #6.
<!-- SECTION:NOTES:END -->
