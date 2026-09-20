---
id: TASK-2
title: Curate initial food-pun dataset for detection precision/recall
status: To Do
assignee: []
created_date: '2026-09-16 19:45'
updated_date: '2026-09-20 11:16'
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
Data/Eval owns dataset curation per docs/milestones/milestone-3.md. Food and animal pun data are both available now -- SemEval's own category tags cover both domains (PR #9), and PR #8/TASK-2.5 adds a further hand-authored food+animal set -- so this is no longer a data-availability gap. Per milestone-3.md's domain-sequencing strategy ("fully nail one domain before expanding"), food is evaluated/improved first; animal work follows once that pipeline works end-to-end. See TASK-2.2 (counting/verification), TASK-2.6 (whether to fold PR #8's set in), and TASK-16 (the classifier this eventually feeds).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At least 30 labeled food-pun / non-pun sentence pairs committed under eval/datasets/
- [ ] #2 Labels distinguish homographic vs. homophonic pun_type per docs/contracts.md
<!-- AC:END -->
