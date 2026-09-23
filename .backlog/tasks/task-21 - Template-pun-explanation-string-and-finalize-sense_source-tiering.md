---
id: TASK-21
title: Template pun explanation string and finalize sense_source tiering
status: To Do
assignee: []
created_date: '2026-09-20 10:04'
updated_date: '2026-09-23 10:29'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-19
references:
  - docs/design/sense-selection.md
  - docs/contracts.md
project: inference
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Step 6 of docs/design/sense-selection.md's approach: once TASK-19 has produced a winning sense pair, template the /analyze explanation field per the design doc's pattern ("{word}" can mean {gloss_1} or {gloss_2}; the sentence supports both because {evidence}), and make sure sense_source reflects whichever tier actually won end-to-end. When no tier produces a confident pair, Inference doesn't template anything: per docs/contracts.md (2026-09-23 Tier 3 redesign) it returns sense_source "llm_fallback" with an empty explanation, and Backend's Gemini supplies the senses (TASK-20). Inference never calls an LLM itself.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a winning sense pair, explanation is templated per docs/design/sense-selection.md's pattern
- [ ] #2 Unit tests cover the dough/money example end-to-end producing the exact explanation shape
- [ ] #3 sense_source is added to inference/main.py's AnalyzeResponse Pydantic model (FastAPI's response_model otherwise drops it) and is wordnet/wiktionary for whichever tier produced the winning senses; when no tier produced a confident pair it is llm_fallback with an empty explanation; null only when is_pun is false
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
