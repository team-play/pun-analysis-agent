---
id: TASK-2
title: Curate initial food-pun dataset for detection precision/recall
status: To Do
assignee:
  - Livia
created_date: '2026-09-16 19:45'
updated_date: '2026-09-26 00:11'
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
Data/Eval owns dataset curation per docs/milestones/milestone-3.md. Food and animal pun data are both available (SemEval's own category tags cover both domains, PR #9), and Livia and Prateek decided the baseline covers food and animal from the beginning rather than treating animal as a stretch goal. See TASK-2.2 (counting and subset decision), TASK-2.6 (PR #8's set, deferred) and TASK-16 (the classifier this feeds).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 At least 30 labeled food-pun / non-pun sentence pairs committed under eval/datasets/
- [x] #2 Labels distinguish homographic vs. homophonic pun_type per docs/contracts.md
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Both of this umbrella task's original ACs are now satisfied by its subtasks: AC1 (>=30 labeled food-pun/non-pun pairs under eval/datasets/) is satisfied by the committed eval/datasets/semeval2017_task7_puns.csv, verified as 247 food/animal-food rows by TASK-2.2's AC1. AC2 (homographic vs. homophonic pun_type labeling per docs/contracts.md) was delivered by TASK-2.1 (Done), which normalized SemEval's heterographic label to homophonic and nulled pun_type on non-pun rows. Status stays To Do: TASK-2.3 (harness) and TASK-2.4 (margin calibration) are still open under this parent.
<!-- SECTION:NOTES:END -->
