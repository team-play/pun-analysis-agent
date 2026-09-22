---
id: TASK-2
title: Curate initial food-pun dataset for detection precision/recall
status: To Do
assignee: []
created_date: '2026-09-16 19:45'
updated_date: '2026-09-22 10:37'
due_date: '2026-09-21'
labels:
  - dataset
dependencies: []
references:
  - docs/milestones/milestone-3.md
  - docs/contracts.md
project: eval
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Data/Eval owns dataset curation per docs/milestones/milestone-3.md. Scope is food-based puns for the baseline (animal puns are a stretch goal).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At least 30 labeled food-pun / non-pun sentence pairs committed under eval/datasets/
- [ ] #2 Labels distinguish homographic vs. homophonic pun_type per docs/contracts.md
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
