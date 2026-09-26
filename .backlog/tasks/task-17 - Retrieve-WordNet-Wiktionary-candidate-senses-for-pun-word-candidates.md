---
id: TASK-17
title: Retrieve WordNet/Wiktionary candidate senses for pun-word candidates
status: In Progress
assignee:
  - Andi J. Castillo-Mauricio
created_date: '2026-09-20 10:04'
updated_date: '2026-09-26 12:00'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-1
references:
  - docs/design/sense-selection.md
project: inference
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Step 2 of docs/design/sense-selection.md's approach: for each POS-tagged candidate from TASK-1, pull WordNet synsets, glosses, and hypernym chains (Tier 0, Open English WordNet). When a candidate lemma has 0-1 senses, expand the inventory with Wiktionary definitions (Tier 2, kaikki.org dumps) before scoring gives up on it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a candidate word and POS tag, returns its WordNet synsets with glosses and hypernym chains
- [x] #2 When WordNet returns 0-1 senses for a candidate, Wiktionary definitions are pulled as a fallback sense inventory
- [x] #3 Unit tests cover a candidate with 2+ WordNet senses and one with a coverage gap requiring the Wiktionary fallback
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `wn` (Open English WordNet, `oewn:2025`) and `httpx` as runtime deps; download `oewn:2025` in the Docker build and the CI `test-python` job, documented in docs/local-setup.md. 2. Add inference/senses.py: `Sense` dataclass (gloss, hypernyms, lexfile, source); `get_wordnet_senses()` (Tier 0: synsets for the candidate's lemma across its POS tags, with glosses and hypernym chains), lazily loaded behind a lock. 3. `get_wiktionary_senses()` (Tier 2 fallback) and `get_candidate_senses()`, which falls back to Wiktionary when WordNet returns fewer than 2 senses. 4. Add inference/tests/test_senses.py covering multi-sense retrieval, the fallback path and its boundary, and Wiktionary failure handling. 5. Run ruff + pytest, verify ACs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Tier 2 uses Wiktionary's live REST API instead of the kaikki.org dumps named in the description and in docs/design/sense-selection.md: the dump is 2.6+ GB even split by POS, against ~107MB for WordNet, which is too much image for a fallback that only runs when WordNet has fewer than 2 senses. Any Wiktionary failure (timeout, HTTP error, malformed JSON, invalid URL) degrades to no extra senses, never an error from /analyze, and every test stubs the network. The design doc is being updated to match in a separate design-change PR.

Review fixes (code-review skill passes and PR #25): WordNet loaded behind a double-checked lock, with `wn.config.allow_multithreading` set so the shared `Wordnet` works on FastAPI threadpool workers; hypernym walk capped at 50; Wiktionary queried by lemma, not surface text; `hypernyms` is a tuple so `Sense` is hashable; `lexfile` added for TASK-19 (None means "category unknown"); Dockerfile uses `uv run --no-dev` so dev deps stay out of the image.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added inference/senses.py: `get_candidate_senses()` returns WordNet senses (gloss, hypernym chain, lexfile) and falls back to Wiktionary definitions when WordNet has 0-1 senses (AC1, AC2). inference/tests/test_senses.py covers "dough" (2+ senses), "rizz" (coverage gap), "pun" (exactly 1 sense, merged with Wiktionary), NOUN/VERB/both ADJ tags, lemma-based lookup, cross-thread WordNet use, hashability, and Wiktionary timeout/5xx/non-JSON/invalid-URL handling (AC3). Verified: uv run pytest (17 passed), uv run ruff check and ruff format (clean).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
