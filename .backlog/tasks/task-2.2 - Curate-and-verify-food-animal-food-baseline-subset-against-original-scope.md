---
id: TASK-2.2
title: Curate and verify food/animal-food baseline subset against original scope
status: Done
assignee:
  - Livia
created_date: '2026-09-20 10:05'
updated_date: '2026-09-26 00:04'
labels:
  - dataset
milestone: m-6
dependencies: []
references:
  - 'https://github.com/team-play/pun-analysis-agent/pull/15'
parent_task_id: TASK-2
project: eval
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-2 originally framed animal puns as a stretch goal pending data; that's no longer the blocker. SemEval's own category column already has food/animal rows well past the original >=30-pair bar (218 food, 234 animal, 29 animal/food), and PR #8/TASK-2.5 adds a further aggregated food+animal set (see TASK-2.6 for whether that gets folded in). Per milestone-3.md's domain-sequencing strategy, food is evaluated/improved first, with animal work following once that pipeline works end-to-end -- so this task's counting/verification covers both subsets now, but the TASK-16 training/eval decision it produces should be read as scoped to food first, with the equivalent animal call revisited once animal work begins.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Food and animal-food rows in the eval dataset are counted and checked against the >=30-pair minimum from TASK-2's original scope
- [x] #2 A decision is recorded on whether the food/animal-food subset or the full corpus is used for TASK-16's baseline classifier
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Counted eval/datasets/semeval2017_task7_puns.csv by category: food = 218 rows (175 is_pun=True, 43 is_pun=False); animal/food = 29 rows (19 True, 10 False); combined food-baseline = 247 rows, both classes present in each category. This clears TASK-2's original >=30-pair minimum by a wide margin (AC1). AC2 (subset vs. full corpus for TASK-16's classifier) is a TASK-16 modeling decision, not this task's owner's call, so it's left unchecked for TASK-16's owner; the eval harness (TASK-2.3) already reports both a food_baseline slice and an all_categories slice so either choice is supported without harness changes.

Not to be confused with TASK-2.6: this task is about SemEval's own category-tagged food/animal rows inside semeval2017_task7_puns.csv. TASK-2.6 is a separate decision about PR #8's independent hand-authored food/animal dataset (see eval/datasets/sentences_animal.csv / sentences_food.csv, via PR #15).

Update 2026-09-25 (Livia and Prateek): SemEval data was assessed and looks OK for classification, so it stays the classifier's data source for now.

Decision (Livia and Prateek, 2026-09-25): TASK-16's baseline classifier uses the food/animal subset of the SemEval data (category food, animal, animal/food), not the full corpus.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Counted the SemEval food/animal rows (247 food-baseline rows, past the >=30-pair bar) and recorded the decision that TASK-16's classifier uses the food/animal subset rather than the full corpus. The eval harness (TASK-2.3) already reports both a food_baseline slice and an all_categories slice.
<!-- SECTION:FINAL_SUMMARY:END -->
