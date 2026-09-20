---
id: TASK-16
title: Implement pun/non-pun classifier for /analyze
status: In Progress
assignee:
  - Prateek
created_date: '2026-09-18 15:51'
updated_date: '2026-09-18 16:13'
labels:
  - pun-classifier
dependencies: []
project: inference
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Detection component of the Inference service per docs/milestones/milestone-3.md: classify whether input text contains a pun, and if so whether it is homographic or homophonic (pun_type), feeding the is_pun/pun_type/confidence fields of the /analyze response defined in docs/contracts.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given input text, returns is_pun boolean per docs/contracts.md /analyze schema
- [ ] #2 When is_pun is true, pun_type is classified as homographic or homophonic
- [ ] #3 confidence score reflects classifier certainty
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add pronouncing as a real runtime dependency (uv add pronouncing, not --dev) in inference/pyproject.toml + uv.lock -- currently installed in .venv but unrecorded.

2. Implement a baseline heuristic is_pun classifier (module under inference/models/ or inference/detection.py) so /analyze has a non-throwing response before a trained model exists, per docs/design/detection.md.

3a. Homographic pun_type -- reuse candidate-word + WordNet sense-margin signal from Sense Selection (TASK-1/Andi); stub/fixture the interface if Sense Selection isn't ready yet.

3b. Homophonic pun_type -- new phonetic candidate-generation step using pronouncing/CMUdict to find near-homophone word pairs; own confidence heuristic since there is no sense-tension signal here.

4. Wire the classifier into inference/main.py's /analyze handler, replacing the NotImplementedError, matching docs/contracts.md's is_pun/pun_type/confidence fields.

5. Add unit tests (inference/tests/) covering one non-pun, one homographic, and one homophonic example, per this task's acceptance criteria.

6. Run uv run pytest and uv run ruff check to validate.

7. Flag the confidence-field overlap with Sense Selection's margin score to Andi/Backend before finishing -- /analyze has a single confidence field and docs/design/detection.md leaves ownership as an open question.
<!-- SECTION:PLAN:END -->
