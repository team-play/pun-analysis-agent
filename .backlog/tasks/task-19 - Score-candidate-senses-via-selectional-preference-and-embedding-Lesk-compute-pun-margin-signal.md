---
id: TASK-19
title: >-
  Score candidate senses via selectional preference and embedding-Lesk; compute
  pun-margin signal
status: To Do
assignee: []
created_date: '2026-09-20 10:04'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-17
  - TASK-18
references:
  - docs/design/sense-selection.md
  - docs/contracts.md
project: inference
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps 4-5 of docs/design/sense-selection.md's approach, plus Tier 1: score each TASK-17 sense against its TASK-18 predicate+relation slot using hand-seeded selectional-preference classes (hypernym-chain overlap), falling back to embedding-Lesk gloss/context scoring (sentence-transformers all-MiniLM-L6-v2) when there's no seed for that predicate. Take the margin between the top two senses -- only when they sit under different top-level hypernyms -- as the pun signal and a confidence input, replacing plain argmax WSD.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a candidate's senses and its dependency-parse slot, returns a score per sense from the seeded selectional-preference classes with an embedding-Lesk fallback
- [ ] #2 Computes a margin between the top two senses only when they sit under different top-level hypernyms
- [ ] #3 sense_source is set to wordnet or wiktionary per docs/contracts.md, reflecting which tier produced the winning senses
- [ ] #4 Unit tests cover a confident-margin (pun) case and a low-margin (non-pun) case
<!-- AC:END -->
