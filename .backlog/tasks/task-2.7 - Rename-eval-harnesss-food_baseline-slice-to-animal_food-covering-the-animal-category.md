---
id: TASK-2.7
title: >-
  Rename eval harness's food_baseline slice to animal_food, covering the animal
  category
status: In Progress
assignee: []
created_date: '2026-09-26 12:10'
updated_date: '2026-09-26 12:14'
labels:
  - dataset
milestone: m-6
dependencies: []
references:
  - 'https://github.com/team-play/pun-analysis-agent/pull/15'
parent_task_id: TASK-2
project: eval
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-2.2 recorded the baseline as food, animal, and animal/food together from the start (Livia and Prateek, 2026-09-25; 481 rows), not food-first with animal as a later stretch goal. eval/evaluate_dataset.py:249-257's food_baseline slice only filters on category in {food, animal/food} (247 rows) -- it does not include animal (234 rows) and is named for a baseline that no longer matches the decision. eval/README.md:58 and eval/tests/test_evaluate_dataset.py (test_evaluate_food_baseline_slice_includes_animal_food_category et al.) both describe/assert the current, narrower behavior and need to change alongside the code.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The harness's baseline slice filters on category in {food, animal, animal/food} and is named animal_food (was food_baseline)
- [ ] #2 eval/tests/test_evaluate_dataset.py covers the animal category being included in the slice, and no longer asserts the old food_baseline name/definition
- [ ] #3 eval/README.md's harness section describes the renamed slice and its category set accurately
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
