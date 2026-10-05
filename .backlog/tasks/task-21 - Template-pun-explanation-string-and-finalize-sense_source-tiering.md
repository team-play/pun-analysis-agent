---
id: TASK-21
title: Template pun explanation string and finalize sense_source tiering
status: In Progress
assignee:
  - '@Andi-Cast'
created_date: '2026-09-20 10:04'
updated_date: '2026-10-05 18:32'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-19
references:
  - docs/design/sense-selection.md
  - docs/contracts.md
priority: high
project: inference
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Step 6 of docs/design/sense-selection.md's approach: once TASK-19 has produced a winning sense pair, template the /analyze explanation field per the design doc's pattern ("{word}" can mean {gloss_1} or {gloss_2}; the sentence supports both because {evidence}), and make sure sense_source reflects whichever tier actually won end-to-end. When no tier produces a confident pair, Inference doesn't template anything: per docs/contracts.md (2026-09-23 Tier 3 redesign) it returns sense_source "llm_fallback" with an empty explanation, and Backend's Gemini supplies the senses (TASK-20). Inference never calls an LLM itself.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a winning sense pair, explanation is templated per docs/design/sense-selection.md's pattern
- [x] #2 Unit tests cover the dough/money example end-to-end producing the exact explanation shape
- [x] #3 sense_source (added to AnalyzeResponse by TASK-16) is wordnet/wiktionary for whichever tier produced the winning senses; when no tier produced a confident pair it stays llm_fallback with an empty explanation; null when sense selection didn't run (is_pun false or null)
- [x] #4 Inference logs one INFO line, without the user's text, whenever a homographic pun falls back to llm_fallback because no candidate passed the filters, and whenever a homophonic pun skips sense selection; internal errors stay logged as errors
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. selection.py: explanation follows design step 6: "{word}" can mean "{gloss_1}" or "{gloss_2}"; the sentence supports both because {evidence}. This is a proposed reading, not proof. Glosses quoted with one trailing period stripped (Wiktionary glosses end in one); evidence names the seeded slot in plain words (dobj -> the object of, nsubj -> the subject of, prep_<p> -> "<predicate> ... <p> ___", any other relation -> the generic slot wording) or, for embedding-Lesk, says both definitions are about equally close to the sentence; the score difference is dropped. 2. pun_detector/agent.py: one INFO log per fallback with its reason (homophonic, no_reading) and the ranked-candidate count, never the sentence; main.py configures logging at INFO so the lines reach Cloud Run. 3. Tests: dough exact string, a Wiktionary gloss, each evidence phrase, caplog per fallback reason. 4. sense-selection.md: step 6 example from the real output, drop the "Until TASK-21 lands" paragraph, eval hooks mention the reason logs. Out of scope: trying the next distinct sense when a filter rejects a pair (TASK-63, needs recalibration).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From TASK-17/19: a winning sense pair can mix a WordNet and a Wiktionary sense. Decide which `sense_source` `/analyze` reports for it (suggested: `"wiktionary"` if either sense came from Wiktionary, since WordNet alone couldn't produce that pair).

Decided in TASK-19: a mixed WordNet+Wiktionary winning pair reports "wiktionary"; PunSignal.sense_source already carries this, so TASK-21 passes it through to /analyze.

From TASK-19's architectural review (2026-09-28): (1) PunSignal.sense_source is set even when has_pun_tension() is false, but contracts.md only allows wordnet/wiktionary for a confident pair, so check has_pun_tension first; no signal, no tension, or an exception from default_embed must all become llm_fallback with an empty explanation. (2) Nothing yet decides which candidate's signal wins when several words in a sentence have one (e.g. smallest margin, or the pun detector's word). (3) scoring uses the placeholder MARGIN_THRESHOLD (0.1); see TASK-2.4.

From TASK-19's review (2026-09-29): the two-category seeds (need/want + dobj -> food or money) tie any word with a food and a money WordNet sense, whatever the rest of the sentence says: "I want more bread with my soup." scores margin 0. Sense selection only runs when the detector says is_pun: true, but in a real pun sentence a seeded bystander word could still beat the actual pun word. So when choosing which candidate wins, don't let "selectional_preference beats embedding_lesk" decide on its own. PunSignal.method (added in TASK-19) says which scorer produced the pair.

2026-10-03: PR #85 already templates an explanation in pun_detector/agent.py's select_senses ('"{word}" can mean {gloss} or {gloss}. {evidence} Their score difference is {margin}. This is a proposed interpretation...'), which differs from this task's pattern; TASK-58 moves that orchestration into sense selection first. From PR #85's architectural review: sense-selection.md asks Inference to log why it fell back (no confident pair vs an internal error), but agent.py only logs exceptions, so a no-pair result and every homophonic llm_fallback are silent.

2026-10-03 (TASK-58): sense selection's orchestration and its explanation template now live in inference/selection.py (select_senses / pun_readings), not pun_detector/agent.py. From TASK-58's code review: when the shared-word or gloss-similarity filter rejects a candidate's pair, the whole candidate is skipped instead of trying its next distinct sense, so a word with a valid third sense falls through to the next candidate or llm_fallback. These are really 'distinct sense' rules; folding them into scoring's pun_margin/_distinct would fix it, but changes behaviour, so it belongs here or with TASK-2.4.

Implemented (2026-10-05): selection.py builds the explanation with _explain/_quote/_evidence per design step 6 (glosses quoted minus one trailing period; evidence is the seeded slot in plain words for selectional preference, or "both definitions are about equally close to the sentence's meaning" for embedding-Lesk; closing hedge kept; score difference dropped). pun_detector/agent.py logs one INFO line per fallback (reason=homophonic or no_reading, plus the detector's ranked-candidate count, at most 2), never the user's text; main.py sets logging.basicConfig(level=INFO) so the lines reach Cloud Run (checked under uvicorn: printed once, no duplicate or third-party noise). AC #2 and #3: the dough exact-string test is tests/test_selection.py::test_select_senses_explains_the_first_reading; sense_source outcomes were already covered by tests/test_pun_analysis.py (TASK-16/58) and still pass.

Code review (AGENTS.md, independent subagent): no bugs or contract issues; 23 of 26 deliberate breakages caught by tests after the fix (uncaught: removing basicConfig, which pytest cannot observe and was checked under uvicorn instead; lemma vs surface text, not new behaviour; stripping every trailing period instead of one, caught since the follow-up below). The zero-candidate log gap was closed with a test. Fixed in scope: a blank line lost before a design-doc heading, the ranked_candidates count documented as the detector's top picks (not the words tried), and "reason lines never include the user's text" (a traceback can). Architectural review: not required, since the change touches no contract (contracts.md does not fix the explanation's format), topology, isolation rule or dependency; Backend and Frontend only pass explanation through as a string.

Follow-up on the review (2026-10-05, asked for by Andi): _quote now uses curly quotes, so a gloss's own straight quotes (~1.7k Wiktionary glosses) and inch marks (28, e.g. 10"-12.5") are shown as written. Swapping them to single quotes would have turned inches into feet. A final period that belongs to an abbreviation ("etc.": 246 OEWN, 3,464 Wiktionary; "U.S.", "p.m.", "B.C.E.") or an ellipsis is kept, and every other gloss still loses its sentence-ending period. The rule was checked against every gloss in both sources. The word and the evidence's slot words use curly quotes too, for one consistent style. New _quote tests: etc., initialism, ellipsis, doubled period, inner quotes, inch marks. Each new rule fails a test when removed, including stripping every trailing period instead of one (the review's uncaught S3). 131 inference tests pass.

Known limitation, left out of TASK-21's scope: frontend/src/lib/chat/fixtures/analyze-results.ts still has a hand-written explanation the template can no longer produce (cosmetic; nothing parses explanation).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The /analyze explanation now follows design doc step 6: “{word}” can mean “{gloss_1}” or “{gloss_2}”; the sentence supports both because {evidence}. This is a proposed reading, not proof. Evidence is only what scoring used: the seeded slot in plain words (object of / subject of / “<predicate> ... <p> ___”) or, for embedding-Lesk, that both definitions are about equally close to the sentence. Glosses are shown as written in curly quotes, minus a sentence-ending period (abbreviation and ellipsis periods stay). Inference now logs why a pun fell back to llm_fallback (one INFO line, reason=homophonic or no_reading, no user text), with logging configured in main.py. Verified: 131 inference tests pass (exact dough and Lesk strings, evidence per slot, gloss quoting on real-data edge cases, log line per reason, zero-candidate log, no log when nothing fell back), ruff clean, real-model output and a real uvicorn run checked, and an independent code review done with its in-scope findings fixed. Design doc step 6 and eval hooks updated.
<!-- SECTION:FINAL_SUMMARY:END -->
