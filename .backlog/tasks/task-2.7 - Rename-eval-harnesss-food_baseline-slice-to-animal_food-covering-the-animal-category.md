---
id: TASK-2.7
title: >-
  Rename eval harness's food_baseline slice to animal_food, covering the animal
  category
status: Done
assignee: []
created_date: '2026-09-26 12:10'
updated_date: '2026-09-26 12:17'
labels:
  - dataset
milestone: m-6
dependencies: []
references:
  - 'https://github.com/team-play/pun-analysis-agent/pull/40'
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
- [x] #1 The harness's baseline slice filters on category in {food, animal, animal/food} and is named animal_food (was food_baseline)
- [x] #2 eval/tests/test_evaluate_dataset.py covers the animal category being included in the slice, and no longer asserts the old food_baseline name/definition
- [x] #3 eval/README.md's harness section describes the renamed slice and its category set accurately
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Widen evaluate_dataset.py's baseline slice filter from {food, animal/food} to {food, animal, animal/food}. 2. Rename the slice key food_baseline -> animal_food. 3. Update eval/tests/test_evaluate_dataset.py's two slice tests to match, adding a negative case (general-category row excluded). 4. Update eval/README.md's harness section. 5. Run the suite, ruff, and a fixture-mode run against the real dataset to confirm the row count matches TASK-2.2's 481.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented on branch task-2.7-animal-food-slice (off main, not PR #15 -- independent code change). Verified: 22/22 tests pass (uv run python -m unittest discover -s tests), ruff clean, and uv run python evaluate_dataset.py --fixture against the real dataset reports animal_food=481 rows, exactly matching TASK-2.2's recorded count. Opened as PR #40 (https://github.com/team-play/pun-analysis-agent/pull/40).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed the harness's food_baseline slice to animal_food and widened its filter to include the animal category (category in {food, animal, animal/food}), matching TASK-2.2's 481-row baseline decision. Updated its tests (with a new negative case) and eval/README.md. Verified: 22/22 tests pass, ruff clean, fixture-mode run against the real dataset reports 481 rows. Delivered in PR #40.
<!-- SECTION:FINAL_SUMMARY:END -->
