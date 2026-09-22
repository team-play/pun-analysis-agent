---
id: TASK-2.2
title: Curate and verify food/animal-food baseline subset against original scope
status: To Do
assignee: []
created_date: '2026-09-20 10:05'
updated_date: '2026-09-22 10:37'
labels:
  - dataset
milestone: m-6
dependencies: []
parent_task_id: TASK-2
project: eval
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-2 originally scoped Data/Eval's baseline to food-based puns (animal puns a stretch goal) with a >=30 pair minimum. PR #9 landed the full SemEval-2017 Task 7 corpus rather than a food-only set; nobody has verified the food/animal-food rows within it meet that original bar or decided whether TASK-16's baseline classifier should train/eval against just that subset or the full corpus.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Food and animal-food rows in the eval dataset are counted and checked against the >=30-pair minimum from TASK-2's original scope
- [ ] #2 A decision is recorded on whether the food/animal-food subset or the full corpus is used for TASK-16's baseline classifier
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
