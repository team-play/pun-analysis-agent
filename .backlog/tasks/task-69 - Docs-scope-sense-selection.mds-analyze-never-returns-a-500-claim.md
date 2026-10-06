---
id: TASK-69
title: 'Docs: scope sense-selection.md''s "/analyze never returns a 500" claim'
status: To Do
assignee:
  - '@yaitorr'
created_date: '2026-10-06 01:16'
labels: []
milestone: m-4
dependencies: []
references:
  - docs/design/sense-selection.md
  - inference/tests/test_main.py
priority: low
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
docs/design/sense-selection.md's Tier 3 paragraph ends with "`/analyze` itself still never returns a 500". The point it makes holds: no sense-selection failure becomes a 500, since it degrades to `sense_source: "llm_fallback"`. As an absolute, though, it is false. Inference answers 500 when a result breaks the /analyze response contract, on purpose, so a malformed result never reaches Backend looking like a valid one (inference/tests/test_main.py, `test_analyze_answers_500_when_a_result_breaks_the_contract`). A reader who takes the sentence at face value could treat any 500 as impossible, or build on that. Found in TASK-65's architectural review (2026-10-05).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 sense-selection.md no longer says /analyze never returns a 500; it says what sense selection guarantees (its failures become llm_fallback, never a 500)
- [ ] #2 No other doc (contracts.md, project-spec.md, design docs) claims /analyze never returns a 500 without that scope
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
