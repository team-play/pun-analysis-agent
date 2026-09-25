---
id: TASK-2.2
title: Curate and verify food/animal-food baseline subset against original scope
status: To Do
assignee: []
created_date: '2026-09-20 10:05'
updated_date: '2026-09-25 18:35'
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
- [ ] #1 Food and animal-food rows in the eval dataset are counted and checked against the >=30-pair minimum from TASK-2's original scope
- [ ] #2 A decision is recorded on whether the food/animal-food subset or the full corpus is used for TASK-16's baseline classifier
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Not to be confused with TASK-2.6: this task is about SemEval's own category-tagged food/animal rows inside semeval2017_task7_puns.csv. TASK-2.6 is a separate decision about PR #8's independent hand-authored food/animal dataset (see eval/datasets/sentences_animal.csv / sentences_food.csv, via PR #15).

Update 2026-09-25 (Livia and Prateek): SemEval data was assessed and looks OK for classification, so it stays the classifier's data source for now.
<!-- SECTION:NOTES:END -->
