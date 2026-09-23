---
id: TASK-16
title: Implement pun/non-pun classifier for /analyze
status: In Progress
assignee: []
created_date: '2026-09-18 15:51'
updated_date: '2026-09-23 10:44'
labels:
  - pun-classifier
dependencies:
  - TASK-1
project: inference
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Detection component of the Inference service per docs/milestones/milestone-3.md: classify whether input text contains a pun, and if so whether it is homographic or homophonic (pun_type), feeding the is_pun/pun_type/confidence fields of the /analyze response defined in docs/contracts.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When is_pun is true, pun_type is classified as homographic or homophonic
- [ ] #2 confidence is the classifier's probability that the text is a pun (docs/contracts.md); detection alone sets is_pun, pun_type and confidence, and sense selection never changes them
- [ ] #3 Given input text, returns is_pun true/false per docs/contracts.md's /analyze schema, or null (with null pun_type and confidence) when it can't judge the text
- [ ] #4 inference/main.py's AnalyzeResponse widens is_pun to bool | None and confidence to float | None (required but nullable, no defaults), with a test for the undetermined case, so FastAPI's response_model doesn't turn it into a 500
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

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
