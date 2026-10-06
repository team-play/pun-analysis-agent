---
id: TASK-64
title: 'Frontend: update the sample analyze result''s explanation to TASK-21''s template'
status: In Progress
assignee:
  - '@Andi-Cast'
created_date: '2026-10-05 23:50'
updated_date: '2026-10-06 01:03'
labels: []
milestone: m-4
dependencies:
  - TASK-21
priority: low
project: frontend
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From PR #106's review (Yai, 2026-10-05): `punResult` in frontend/src/lib/chat/fixtures/analyze-results.ts, the sample result shared by the stub adapter, the wire-format test streams and the component tests, still has a hand-written explanation that Inference can't produce ('"Dough" plays on its literal sense (bread dough) and its slang sense (money) — a baker "not making enough dough" reads as both...'). Since TASK-21, Inference templates every wordnet/wiktionary explanation per docs/design/sense-selection.md step 6, so the stub UI shows text the live service never sends. Cosmetic: nothing parses `explanation`. One test finds the explanation by a piece of its text (src/App.test.tsx), so it changes with the fixture.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `punResult.explanation` is a real output of the step 6 template: “dough” can mean “a flour mixture stiff enough to knead or roll” or “informal terms for money”; the sentence supports both because both fit as the object of “need”. This is a proposed reading, not proof.
- [x] #2 Frontend tests and Biome pass; the App test that finds the explanation by its text matches the new one
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. frontend/src/lib/chat/fixtures/analyze-results.ts: punResult.explanation becomes the real step 6 output for "The baker needed more dough." (copied from Inference on main, not retyped). 2. Frontend tests and Biome pass unchanged (no test asserts on the string). Trivial data change, so no subagent review (AGENTS.md: non-trivial changes).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done (2026-10-06): punResult.explanation is now the real output of main's Inference for "The baker needed more dough." (copied from load_analysis().analyze(), not retyped); words_involved ["dough"] and sense_source "wordnet" already matched. src/App.test.tsx found the explanation by "its slang sense (money)", a piece of the old string, so it now looks for "informal terms for money"; the description and AC #2 said no test depended on the string, and were corrected. 171 frontend tests pass; pnpm lint clean. A data and test-matcher change, so self-reviewed rather than by a subagent (AGENTS.md asks for one on non-trivial changes); no contract, topology or dependency change, and no docs mention the old string.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The frontend sample result (punResult) now shows a real explanation from Inference's step 6 template instead of a hand-written one, so the stub UI matches what the live service sends. The App test that finds the explanation by its text looks for the new wording. 171 frontend tests pass, Biome clean.
<!-- SECTION:FINAL_SUMMARY:END -->
