---
id: TASK-18
title: Extract dependency-parse local context for candidate words
status: Done
assignee: []
created_date: '2026-09-20 10:04'
updated_date: '2026-09-25 01:41'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-1
references:
  - docs/design/sense-selection.md
project: inference
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Step 3 of docs/design/sense-selection.md's approach: parse the sentence and find the grammatical relation each candidate from TASK-1 sits in relative to its governing predicate (e.g. dough as obj of need), so later scoring can check whether a sense fits this specific slot rather than relying on bag-of-words proximity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a sentence and a candidate word, returns the candidate's grammatical relation and governing predicate
- [x] #2 Unit tests cover the dough/need(obj) example from docs/design/sense-selection.md
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-enable spaCy's parser in candidates.py's model loader (renamed _get_model -> get_model, now a shared public accessor for context.py to use too).
2. Add context.py: LocalContext dataclass + local_contexts(text, candidates) batch function -- parses the sentence once per call, maps over every candidate, validates each candidate's index against the actual token text before reporting relation/predicate.
3. Add tests covering: dough/dobj/need, batter/nsubj/be (copula case), ROOT/None case, mismatched-candidate raises ValueError, single-parse regression guard.
4. Code review pass (code-review skill, high effort) against the diff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified: 9/9 inference tests pass (uv run pytest), ruff clean. Confirmed via direct spaCy parse printout: dough=dobj/need, batter=nsubj/be (copula "was" is the actual head, not "ready" -- design doc's prose was wrong here), Run=ROOT/None.

Code review (high) found 4 issues, all fixed: (1) local_context() re-parsed the sentence once per candidate -- rewritten as local_contexts(text, candidates) batch function, one parse per sentence regardless of candidate count; (2) reached into candidates._get_model() (a private symbol) -- renamed to public get_model(), now a documented shared accessor; (3) no validation that candidate.index matches the given text -- _token_for() now raises ValueError on a text/candidate mismatch, covered by a test; (4) stray untracked frontend/package-lock.json left over from an earlier PR-review session (repo is pnpm-only) -- deleted.

Also corrected docs/design/sense-selection.md's Step 3 example: it said dough is 'obj' of need and batter is 'nsubj' of 'was ready' -- actual spaCy output (en_core_web_sm, pinned <3.9.0) is 'dobj', and batter's head is the copula 'be', not 'ready'.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented local_contexts(text, candidates) in inference/context.py: re-enables spaCy's dependency parser (candidates.py) and reports each candidate's grammatical relation + governing predicate (relation="ROOT", predicate=None when the candidate has no governor). Parses once per sentence, not once per candidate. Verified with 5 new unit tests plus the 4 pre-existing candidates/main tests (9/9 passing), ruff clean. Code review (high) done, all 4 findings fixed. docs/design/sense-selection.md's Step 3 example corrected to match verified spaCy output.
<!-- SECTION:FINAL_SUMMARY:END -->
