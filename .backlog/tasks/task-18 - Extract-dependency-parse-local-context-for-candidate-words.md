---
id: TASK-18
title: Extract dependency-parse local context for candidate words
status: To Do
assignee: []
created_date: '2026-09-20 10:04'
updated_date: '2026-09-22 10:37'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-1
references:
  - docs/design/sense-selection.md
project: inference
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Step 3 of docs/design/sense-selection.md's approach: parse the sentence and find the grammatical relation each candidate from TASK-1 sits in relative to its governing predicate (e.g. dough as obj of need), so later scoring can check whether a sense fits this specific slot rather than relying on bag-of-words proximity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a sentence and a candidate word, returns the candidate's grammatical relation and governing predicate
- [ ] #2 Unit tests cover the dough/need(obj) example from docs/design/sense-selection.md
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
