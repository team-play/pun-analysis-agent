---
id: TASK-15
title: 'Export conversation as JSON, and reset controls'
status: Done
assignee:
  - '@yaitorr'
created_date: '2026-09-18 00:02'
updated_date: '2026-10-05 02:31'
due_date: '2026-09-21'
labels: []
milestone: m-1
dependencies:
  - TASK-6.1
  - TASK-6.3
references:
  - docs/design/frontend-design.md
  - docs/contracts.md
priority: medium
project: frontend
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
docs/design/frontend-design.md's 'Chat' component section specifies exporting the conversation to clipboard as JSON (for Data/Eval's full-pipeline explanation-quality evaluation per docs/project-spec.md) or resetting it, independent of the localStorage persistence layer — read directly off the runtime's live message state, not the persisted thread history. This is already in-scope per that doc but wasn't tracked as a task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A visible action copies the current thread's live runtime message state (not the persisted localStorage copy) to the clipboard as JSON
- [x] #2 JSON shape: {exportedAt: ISO 8601 string, threadId: string, messages: [{role: 'user'|'assistant', content: [{type:'text', text} | {type:'tool-call', toolCallId, toolName, args, result}]}]}, where a tool-call part's result reuses docs/contracts.md's /analyze response schema verbatim rather than redefining it
- [x] #3 Exporting a Phase-1-only thread (text-only parts, per docs/design/frontend-design.md's schema-drift note) produces valid JSON with text-only content parts and no tool-call parts
- [x] #4 Exporting a thread containing a resolved analyze_pun tool call includes that call's args and result verbatim
- [x] #5 Reset is the sidebar's existing New Thread action (switchToNewThread): it returns the view to the greeting state on a fresh thread, independent of the export action, and leaves the previous thread intact in the sidebar and in persistence
- [x] #6 Both actions are unit-tested against TASK-6.3's stub fixtures (Phase 1 text-only and Phase 2 tool-call shapes), no live backend required
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pure exportThread(messages, threadId, now) in frontend/src/lib/chat/export-thread.ts, next to request-messages.ts: maps runtime ThreadMessages to the AC #2 shape; text and tool-call parts only (reasoning etc. dropped); a tool call without a result (failed/stopped reply) is kept with result omitted; result typed as the shared AnalyzeResult.
2. Unit tests for exportThread against TASK-6.3's fixtures: Phase 1 text-only, Phase 2 resolved call (args/result verbatim), unresolved call, dropped non-text parts.
3. Clipboard button on the active sidebar entry only (next to the existing '...' button): reads the main thread runtime's live messages, threadId = remoteId ?? id, writes JSON via the existing useCopyToClipboard hook. Inactive entries aren't loaded, so exporting them would mean reading localStorage (ruled out by AC #1).
4. Reset = existing New Thread (decided with user): App test that it returns to the greeting while the previous thread stays in the sidebar; AC #5 reworded accordingly.
5. App test for the copy button: only on the active entry; clipboard receives the live thread JSON.
6. Update docs/design/frontend-design.md's Export/reset bullet.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented exportThread (frontend/src/lib/chat/export-thread.ts) + unit tests against TASK-6.3 fixtures; 'Copy as JSON' button on the open thread's sidebar entry only (hidden while renaming, disabled while a reply streams); reset = existing New Thread. Adversarial review (subagent) found: rename-input overlap, mid-run partial export, wrong Tailwind-specificity comment, weak storage-read proof, reset test not checking persistence — all fixed; the storage test now tampers with the saved copy and asserts the export still matches the screen. Visually checked in the stub dev server: long-title truncation with both buttons, rename state, copied JSON payload. Not addressed: export right after switching threads, before its history loads, could be empty (reviewer nit 10).

Validation: frontend pnpm test 171/171 passed (3 consecutive runs), pnpm lint and tsc -b clean; each new behaviour mutation-checked (removing the active-only guard, the result field, or the disabled state fails its test). DoD #2: no architectural review needed (no change to contracts.md, topology, isolation or dependencies). DoD #3: README, project-spec, local-setup and AGENTS.md need no change; docs/design/frontend-design.md's Export/reset bullet updated in a separate commit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a 'Copy as JSON' button on the open thread's sidebar entry that exports the runtime's live messages (exportThread in frontend/src/lib/chat/export-thread.ts: text and analyze_pun calls, each result the /analyze response unchanged). Reset is the existing New Thread button (decided with the user: ThreadRuntime.reset() would leave the saved history behind). Verified with unit tests against TASK-6.3's Phase 1/Phase 2 fixtures, App tests (including one that changes the saved copy and checks the export still matches the screen), and a manual check in the stub dev server.
<!-- SECTION:FINAL_SUMMARY:END -->
