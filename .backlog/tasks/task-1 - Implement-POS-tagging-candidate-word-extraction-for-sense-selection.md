---
id: TASK-1
title: Implement POS-tagging candidate-word extraction for sense selection
status: To Do
assignee: []
created_date: '2026-09-16 19:45'
updated_date: '2026-09-22 10:37'
due_date: '2026-09-21'
labels:
  - wsd
milestone: m-6
dependencies: []
references:
  - docs/milestones/milestone-3.md
  - docs/design/sense-selection.md
project: inference
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
First step of the sense-selection pipeline (docs/milestones/milestone-3.md): tag input text and keep only open-class tokens (NOUN, VERB, ADJ) as pun-word candidates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a sentence, returns candidate tokens filtered to NOUN/VERB/ADJ
- [ ] #2 Closed-class function words are excluded
- [ ] #3 Unit tests cover at least one homographic example (e.g. the dough/money case in docs/design/sense-selection.md)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
