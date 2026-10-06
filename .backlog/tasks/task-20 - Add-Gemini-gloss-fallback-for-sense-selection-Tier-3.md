---
id: TASK-20
title: >-
  Backend: Gemini supplies the senses when /analyze returns llm_fallback (Tier
  3)
status: In Progress
assignee:
  - '@Andi-Cast'
created_date: '2026-09-20 10:04'
updated_date: '2026-10-06 01:38'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-9
  - TASK-12
references:
  - docs/design/sense-selection.md
  - docs/contracts.md
  - backend/src/flows/system-instruction.ts
priority: medium
project: backend
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tier 3 of docs/design/sense-selection.md's sense-selection chain, redesigned 2026-09-23: Inference never calls Gemini. When Tiers 0-2 can't find a confident sense pair, Inference returns is_pun: true with sense_source: "llm_fallback" (empty explanation, suspected word(s) in words_involved), and Backend's Gemini, which receives that unchanged as the analyze_pun tool output, supplies two plausible senses and the explanation itself. The same instruction covers docs/contracts.md's undetermined result (is_pun: null: Inference couldn't judge the text, or Backend couldn't reach it), where Gemini decides whether the text is a pun at all. Detection alone decides is_pun, so detector false positives land here too.

Why: keeping every Gemini call in Backend means one service owns the Gemini key and its free-tier quota (TASK-13 gives Backend's Cloud Run service its own key, in a project without billing), and Inference stays a pure NLP service with no LLM dependency, no key of its own and nothing extra to mock. The original version of this task had Inference prompt Gemini 'via Genkit, already in the stack', but Genkit only exists in Backend (TypeScript); inference/ has no Genkit or Gemini dependency.

Split with TASK-12, which owns the system instruction's structure and scope/redirect rules (TASK-31.1 owns the persona), including consulting Inference through analyze_pun for each new phrase (by instruction, not a forced toolChoice). This task owns the llm_fallback part of that instruction and its behavior. Stays in m-6 because it is still Tier 3 of the sense-selection design, just executed by Backend's Gemini. docs/contracts.md and docs/design/sense-selection.md were updated to this design when the task was rewritten.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 inference/ gains no LLM dependency: no Gemini or Genkit package and no Gemini key
- [x] #2 When the analyze_pun tool result has sense_source "llm_fallback", Gemini's reply explains the pun using two plausible senses of the suspected word that it supplies itself, presented as a lower-confidence reading, or says the text likely isn't a pun (detector false positives land here too)
- [x] #3 The fallback adds no model or Inference calls beyond Genkit's standard tool loop: in tests, the mock model sees exactly two requests for a tool-using turn
- [x] #4 For the undetermined result (is_pun: null), Gemini judges the text itself, pun or not, without implying Inference backed its answer
- [x] #5 A Backend test using Genkit's test double asserts that, for both an llm_fallback and an undetermined (is_pun: null) tool result, the model request carries the matching guidance and the tool output unchanged; real replies are spot-checked against live Gemini and recorded in the task notes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. backend/src/flows/system-instruction.ts: new FALLBACK_RULE paragraph in SYSTEM_INSTRUCTION. On sense_source "llm_fallback", Gemini works out the pun word itself (words_involved is only the classifier's guess, may be wrong, often empty, especially for homophonic puns), gives the two meanings (or the sound-alike words), presents it as its own reading, and says so if the text isn't really a pun. On is_pun null it decides itself without implying the tool backed it. No field names in replies. 2. Move the "If is_pun is null ... decide yourself" sentence out of analyze_pun's tool description so the guidance lives in one place (TASK-12 review note). 3. Tests (Genkit mockModel): the instruction includes the paragraph; for an llm_fallback and an undetermined result, a tool-using turn makes exactly two model requests, and the second carries the guidance and the tool output unchanged. 4. Live spot-check per AGENTS.md's Gemini quota rules: docs/experiments/task-20 script running the chat flow in-process on one pinned Flash-Lite model with an Inference fixture, 5 cases (homographic right guess, wrong guess, homophonic with no words, undetermined, detector false positive), about 10-12 requests, graded replies recorded. 5. Heads-up to Yai: TASK-56 adds a neighbouring paragraph to the same file.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From TASK-12's review: the undetermined-result guidance ("If is_pun is null, the classifier couldn't judge the text: decide yourself.") currently lives in analyze_pun's tool description (backend/src/tools/analyze-pun.ts), not in backend/src/flows/system-instruction.ts. When adding the llm_fallback/undetermined paragraph to the system instruction, move or merge that sentence so the guidance lives in one place.

2026-10-04, while assigning to @Andi-Cast: llm_fallback results already reach Gemini in production, with no guidance yet. Since PR #85, inference/pun_detector/agent.py sets sense_source "llm_fallback" on every is_pun:true result before sense selection, and returns early for anything not homographic. So every homophonic pun arrives as llm_fallback with an empty explanation and an empty words_involved (not the suspected word this task's description assumes), and homographic puns land there whenever select_senses finds no confident pair. Today only analyze_pun's tool description says anything (the is_pun-null sentence in backend/src/tools/analyze-pun.ts); backend/src/flows/system-instruction.ts still has the "TASK-20 will add a paragraph" placeholder. AC #2's guidance therefore has to cover an empty words_involved, where Gemini also picks the word.

2026-10-06, from TASK-56's review: DETECTOR_SCORES_RULE (backend/src/flows/system-instruction.ts) says the scores 'show which way it leans', but the detector calls is_pun from p_pun >= ~0.32 (choose_label in inference/pun_detector/model.py), so a pun call can come with 0.66 non_pun; TASK-56's run 1 had replies saying the classifier 'leans toward' a pun on such a result. Deferred here because this task rewrites the neighbouring paragraph and needs its own live check: reword it (e.g. a higher confidence means a firmer call; the classifier calls a pun from a confidence well under one half) and re-run docs/experiments/task-56/check.mjs alongside this task's spot-checks. See docs/experiments/task-56/README.md.

Implemented (2026-10-06): FALLBACK_RULE in backend/src/flows/system-instruction.ts, appended to SYSTEM_INSTRUCTION. On sense_source "llm_fallback", Gemini first checks the text really is a pun (the classifier can be wrong), then works out the pun word itself (words_involved is only the classifier's guess: may be wrong, often empty, always for homophonic puns), gives the two meanings or sound-alike words, and says the reading is its own. On is_pun null it decides itself without implying the tool backed it. No field names in replies. The "If is_pun is null ... decide yourself" sentence moved out of analyze_pun's tool description into it, so the guidance lives in one place; Backend's own undetermined result (Inference unreachable) gets the same instruction, since every reply goes through createChatFlow. inference/ has no LLM dependency (AC #1).

Tests (backend/tests/flows/chat.test.ts): the instruction includes FALLBACK_RULE; for an llm_fallback and the undetermined result, a tool-using turn makes exactly 2 model requests and 1 Inference call, and the second request carries that result's own part of the guidance (matched per result) and the tool output unchanged. 207 backend tests pass; tsc and pnpm lint clean.

Live spot-check (AC #5), docs/experiments/task-20 (check.mjs, README, runs/): Backend's chat flow in-process on gemini-3.5-flash-lite (pinned), 5 cases (homographic right guess, wrong guess banker->interest, homophonic with no words, undetermined, detector false positive), 3 runs of 3 wordings, 30 requests on 2026-10-06 after Andi checked the day's usage. Every run: the model replaced the wrong guess with the right word, found homophonic sound-alikes itself, decided undetermined texts without crediting the tool, and never mentioned field names. Saying the reading is its own varied (1/4, 4/4, 2/4 pun replies) and the false positive was caught in run 1 only; with one reply per case the wordings can't be told apart. Shipped run 3's wording (verdict check first), plus one untested change from the review: homophonic puns reach llm_fallback without a dictionary lookup, so the reason given is "didn't explain it from its dictionaries", not "couldn't confirm". AC #2 is met as written (two senses presented as Gemini's own reading, or "not a pun"), but how consistently it hedges and catches false positives could still be improved if the eval shows it matters: a comparison worth acting on needs several replies per case and wording (~90 requests over several days). Detector false positives are better caught by the detector itself.

Review (AGENTS.md code + architectural, independent subagent): no contract, topology or isolation problems; contracts.md's llm_fallback/undetermined hand-off stays true, no conflict with TASK-56 or TASK-12. Fixed: per-result guidance assertions (deleting either half of FALLBACK_RULE now fails a test), the homophonic reason, Biome formatting of the run files, and the script's stand-in results (imports UNDETERMINED_ANALYZE_RESULT; README notes they omit probabilities). Out of scope, noted: Frontend's card labels every llm_fallback result "Senses supplied by Gemini, at lower confidence", even when Otto concludes the text isn't a pun.
<!-- SECTION:NOTES:END -->
