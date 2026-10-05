---
id: TASK-62
title: >-
  Inference: let sense selection reuse the detector's embeddings, in a bounded
  cache
status: To Do
assignee:
  - '@yaitorr'
created_date: '2026-10-05 09:21'
labels: []
dependencies:
  - TASK-51
references:
  - inference/pun_detector/features.py
  - inference/pun_detector/agent.py
  - inference/scoring.py
project: inference
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On a homographic pun, the detector embeds the sentence and its candidates' WordNet glosses, and keeps them in `FeatureExtractor.vectors`. In the same request, sense selection embeds the same sentence again for every candidate (`_embedding_lesk_scores`) and gloss pairs again (`gloss_similarity`), through the same ONNX model. Reusing the detector's vectors would skip that repeated work. Raised during TASK-51; the latency gain is not yet measured (the warm baseline was about 0.1 s per `/analyze` locally on 2026-10-05).

`FeatureExtractor.vectors` is currently an unbounded dict: it grows with every new sentence and gloss for the life of the instance, inside Inference's 1 GiB Cloud Run limit (about 1.5 KB per 384-dimension float32 vector). Relying on it more needs a purge policy. An embedding never goes stale for a fixed model, so the only reason to evict is memory, and expiring entries by age would buy nothing. Scale-to-zero (`--min-instances=0`) already empties the cache whenever the service goes idle.

How often requests share embeddings in real traffic is unknown. Hits within one request are certain. Across requests, sentences rarely repeat outside known demo puns, while glosses of common pun words (bank, interest, dough) should repeat more. Logging hit rates is how we find out.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sense selection reads embeddings the detector already computed for the same text instead of re-embedding them, and its results are unchanged (the existing selection tests and the Dockerfile warm-up check still pass)
- [ ] #2 The embedding cache is bounded by a fixed entry count chosen from measured memory and evicts least-recently-used entries; a test fails if it grows past the bound or evicts a recently used entry first
- [ ] #3 Each /analyze logs the cache's hits and misses for that request (sentence and glosses), so the cross-request hit rate can be read from production logs
- [ ] #4 Before/after timing of a warm /analyze on a homographic pun and peak memory are recorded in the task notes
- [ ] #5 docs/local-setup.md or the code comments explain the cache bound and why there is no time-based expiry
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
