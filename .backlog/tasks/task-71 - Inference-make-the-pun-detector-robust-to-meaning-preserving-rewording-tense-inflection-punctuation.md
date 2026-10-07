---
id: TASK-71
title: >-
  Inference: make the pun detector robust to meaning-preserving rewording
  (tense, inflection, punctuation)
status: To Do
assignee:
  - '@Groverpr93'
created_date: '2026-10-07 09:28'
updated_date: '2026-10-07 13:07'
labels:
  - pun-classifier
dependencies:
  - TASK-66
references:
  - docs/experiments/pun-detector/prototype-1/README.md
  - inference/pun_detector/agent.py
  - inference/pun_detector/model.py
priority: medium
type: bug
project: inference
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The prototype-1 detector flips its decision on rewordings that do not change the pun. Found on 2026-10-07 from a chat export: "The baker needs more dough." scores P(pun) 0.533 with pun_type homophonic (homographic 0.22, homophonic 0.31), so `PunAnalysis.analyze` sends it straight to sense_source llm_fallback without trying WordNet. "The baker needed more dough." (the warm-up and Dockerfile smoke-test sentence) scores 0.949 homographic and gets a WordNet reading of "dough". Dropping the final period ("The baker needs more dough") gives 0.606 homophonic. CI and the deploy check only the past-tense sentence, so they stay green while the present tense falls back.

Why, from splitting the logits of both sentences by feature group: the 384 sentence-embedding dimensions decide the result (for "needs", non_pun +1.31, homographic -1.03), while the 22 WordNet pair features move each logit by 0.12 at most. The detector also never ranks the pun word: its top two candidates are "baker" and "needs"/"needed". "dough" reaches `words_involved` only because sense selection goes on to try the rest of the sentence. So the detector has learned what pun-like sentences look like rather than which word carries the pun, and small shifts in the embedding flip both is_pun confidence and type.

Depends on TASK-66, which retrains the detector on plain-text negatives. This task measures and fixes wording sensitivity on top of that retrain, so both changes are not tuned against different models.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A rewording-variant evaluation set is committed under `eval/` with its provenance documented: groups of sentences that keep the same pun and pun word but differ only in tense, number, contractions or final punctuation. It includes the "The baker needs/needed more dough" group and is not used for training
- [ ] #2 For prototype-1 and the new detector, the report gives the share of groups whose is_pun and pun_type agree across every variant, and the spread of P(pun) within groups
- [ ] #3 The new detector has a higher group-agreement share than prototype-1 and keeps TASK-66 limits: plain-text false-positive rate and held-out pun recall
- [ ] #4 "The baker needs more dough." is analyzed as a homographic pun with sense_source wordnet and words_involved ["dough"], and a test or build-time check fails if that regresses
- [ ] #5 Results are recorded under `docs/experiments/pun-detector/` in the style of prototype-1
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Another case, 2026-10-07 (found while verifying TASK-73/74 on a fully local run; detector as on main at 502d021, Inference unchanged since): "I used to be a baker, but I couldn't make enough dough." gives is_pun true, confidence 0.997, homographic 0.660 / homophonic 0.337, but words_involved ["baker"] and sense_source llm_fallback. Inference logged "Sense selection fell back to llm_fallback: reason=no_reading ranked_candidates=2". Unlike "The baker needs more dough.", where sense selection still reaches "dough", here it never does: the two ranked candidates yield no reading and the pun word is lost. Gemini's reply still named "dough" correctly, so the user-facing answer was right, but the card's analysis credits the wrong word. A candidate for AC #4's regression check and the AC #1 eval set (same pun word, longer sentence).
<!-- SECTION:NOTES:END -->
