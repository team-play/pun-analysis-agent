---
id: TASK-9
title: 'Backend: analyze_pun tool (Phase 2) against a fixture /analyze'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-23 10:29'
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
- [ ] #3 The tool-call event shape (toolRequest/toolResponse chunks, toolCallId correlation rule) is implemented exactly as finalized in docs/contracts.md, closing sync point 3
- [ ] #4 Non-2xx, malformed or timed-out Inference responses don't crash the chat flow: the tool returns docs/contracts.md's undetermined /analyze result (is_pun: true, sense_source: llm_fallback, confidence: 0, no words), so Gemini judges the text itself
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
