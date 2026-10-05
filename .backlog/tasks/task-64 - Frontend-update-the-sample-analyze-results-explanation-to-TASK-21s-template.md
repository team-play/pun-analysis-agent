---
id: TASK-64
title: 'Frontend: update the sample analyze result''s explanation to TASK-21''s template'
status: To Do
assignee:
  - '@Andi-Cast'
created_date: '2026-10-05 23:50'
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
From PR #106's review (Yai, 2026-10-05): `punResult` in frontend/src/lib/chat/fixtures/analyze-results.ts, the sample result shared by the stub adapter, the wire-format test streams and the component tests, still has a hand-written explanation that Inference can't produce ('"Dough" plays on its literal sense (bread dough) and its slang sense (money) — a baker "not making enough dough" reads as both...'). Since TASK-21, Inference templates every wordnet/wiktionary explanation per docs/design/sense-selection.md step 6, so the stub UI shows text the live service never sends. Cosmetic: nothing parses `explanation`, and no test asserts on this string.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `punResult.explanation` is a real output of the step 6 template: “dough” can mean “a flour mixture stiff enough to knead or roll” or “informal terms for money”; the sentence supports both because both fit as the object of “need”. This is a proposed reading, not proof.
- [ ] #2 Frontend tests and Biome pass unchanged
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
