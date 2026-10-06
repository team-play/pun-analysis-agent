# Describing the detector's scores in words (TASK-56)

`analyze_pun`'s `confidence` and `probabilities` are the detector's raw, uncalibrated output ([`docs/contracts.md`](../../contracts.md)). TASK-56 adds a paragraph to Gemini's system instruction, `DETECTOR_SCORES_RULE` in [`backend/src/flows/system-instruction.ts`](../../../backend/src/flows/system-instruction.ts), telling it to describe them in words and never as a number or a certainty, and to leave the exact numbers to Frontend's tool-call card. This checks whether the production Flash-Lite models follow it.

## How it's checked

[`check.mjs`](check.mjs) runs Backend's own chat flow (`createChatFlow`) in-process, with each model as a one-model ladder at its production config (`GEMINI_MODEL_CONFIG`, so `gemini-3.1-flash-lite` thinks at MEDIUM). `analyze_pun` answers with Inference's real results for the texts below, recorded by [`record_results.py`](record_results.py) in [`analyze-results.json`](analyze-results.json) at commit `6c53825`, so the run needs no Inference.

| Case | Text | Inference's result |
|---|---|---|
| clear pun | "The past, the present and the future walked into a bar. It was tense." | pun, homographic, confidence 0.98 (homographic 0.89), WordNet senses |
| clear non-pun | "There's no place like home." | not a pun, confidence 0.0001 |
| class split | "The nudist defended himself by citing his Constitutional right to bare arms." | pun, confidence 0.99, but homographic 0.50 vs homophonic 0.49; `llm_fallback` |
| tentative | "If they ever have a contest for the best looking mannequin, there will be stiff competition." | pun, confidence 0.34 (just over the detector's 0.32 threshold); `llm_fallback` |
| asks for a percentage | the class split, with "and how sure is the classifier, as a percentage?" | as the class split |

Each prompt is "Is this a pun? <text>", sent as a new conversation. 5 cases × 2 models × 3 runs = 30 replies.

Quota (AGENTS.md): each reply is at least two requests, so about 60 to 70 in all, about 30 to 35 per model, well under half of each Flash-Lite model's 500/day. One request at a time, at most 10/min per model, and the run stops at the first 429.

Run it from the repo root, with a Gemini key in `backend/.env.local`:

```bash
node --env-file=backend/.env.local docs/experiments/task-56/check.mjs
```

The run is saved as `runs/<start time>.json`, with every reply and the text each `analyze_pun` call sent.

### Grading

Fixed before any reply was read. A reply **follows** the paragraph if it does all of these:

- gives no score as a number: no percentage, decimal, fraction or "N out of M";
- doesn't present the classifier's call as certain ("definitely", "100%", "the classifier is sure");
  (Clarified after run 1, when the first borderline reply came up: calling the classifier "confident" describes how firm its call is and follows; calling it "certain" or "sure" is a miss.)
- **class split** and **asks for a percentage:** says the classifier sees a pun but can't settle, or is split on, which kind;
- **tentative:** conveys that the call was tentative or weak, and doesn't report it as the classifier calling the text not a pun;
- **asks for a percentage:** doesn't give a number, and points to the analysis card (or otherwise says where the exact scores are).

Otherwise it's a **miss**, recorded with the first rule it breaks. Whether Otto himself agrees the text is a pun isn't graded: that's TASK-20's `llm_fallback` guidance, not yet written. A reply whose `analyze_pun` call for the user's text didn't send it as recorded (ignoring surrounding whitespace) is left out (a second call, on an example pun Otto wrote himself, doesn't count against it).

## Results

### Run 1: the first wording

Run of 2026-10-06 00:55 UTC ([`runs/2026-10-06T00-55-24.539Z.json`](runs/2026-10-06T00-55-24.539Z.json)), with the paragraph as first written. No reply failed, and every `analyze_pun` call sent the user's text as recorded. No reply gave a score as a number or called the classifier certain.

| Case | `gemini-3.5-flash-lite` | `gemini-3.1-flash-lite` |
|---|---|---|
| clear pun | 3 of 3 | 3 of 3 |
| clear non-pun | 3 of 3 | 3 of 3 |
| class split | **0 of 3** | 2 of 2 |
| tentative | 3 of 3 | 3 of 3 |
| asks for a percentage | 2 of 3 | 3 of 3 |

Reply by reply, for anyone checking the grading (the index into `results`). Every reply not listed here follows.

- `gemini-3.5-flash-lite`, misses, all on the split: 4, 14, 24 ("makes a clear call that this is a homographic pun", with no word on the split); 18 (no split, and no pointer to the card).
- `gemini-3.1-flash-lite`: 15 is empty, with no tool call and no error, so it's left out.
- 2 also called `analyze_pun` on an example pun it wrote, which PURPOSE allows; that call got the undetermined result.

`gemini-3.5-flash-lite`, the ladder's top rung, ignored the split sentence whenever the user didn't ask about confidence, and attached "clear call" to the pun type.

### Run 2: the split sentence moved up

The split sentence was moved to right after the scores' definition and tied to `pun_type` ("only the more likely of the two kinds"), the wording now in `DETECTOR_SCORES_RULE`. Run of 2026-10-06 01:05 UTC ([`runs/2026-10-06T01-05-16.890Z.json`](runs/2026-10-06T01-05-16.890Z.json)). No reply failed or was empty, and every `analyze_pun` call sent the user's text as recorded. No reply gave a score as a number.

| Case | `gemini-3.5-flash-lite` | `gemini-3.1-flash-lite` |
|---|---|---|
| clear pun | 3 of 3 | 3 of 3 |
| clear non-pun | 3 of 3 | 3 of 3 |
| class split | 3 of 3 | 3 of 3 |
| tentative | 3 of 3 | 1 of 3 |
| asks for a percentage | 1 of 3 | 0 of 3 |

Reply by reply (the index into `results`). Every reply not listed here follows.

- `gemini-3.5-flash-lite`, misses: 18 and 28 (asked for a percentage, both pointed to the card but left out the split).
- `gemini-3.1-flash-lite`, misses:
  - tentative: 7 and 27 ("That is indeed a pun", with nothing on how firm the call was);
  - asks for a percentage: 9 and 29 (the classifier "is quite certain"); 19 (no split, and the call "was very firm").
- Follows, though borderline: 5 and 14 open with Otto's own "that is definitely a pun", then describe the classifier's call correctly. Otto's own verdict isn't graded (see Grading).

## Decision

Run 2's wording ships (decided with Yai on 2026-10-06).

- **It does what TASK-56 asks.** Across both runs, no reply gave a score as a number. With run 2's wording, both models described the class split in all 6 replies where the user asked only whether the text was a pun. That's up from 0 of 3 on `gemini-3.5-flash-lite`, the ladder's top rung.
- **The tentative misses are accepted.** The paragraph says how to describe the scores, not that every reply must mention them. A reply that just calls the text a pun, as 7 and 27 do, doesn't misstate them.
- **It cost the percentage case.** When the user asks for a percentage, run 1's wording followed in 5 of 6 replies and run 2's in 1 of 6. Both models still point to the analysis card and give no number, but they often leave out the split, and `gemini-3.1-flash-lite` twice called the classifier "quite certain", which the paragraph forbids. Run 2 still ships because the plain question is how most texts arrive, and there it went from 2 of 5 to 6 of 6. With 3 replies per cell some of the swing may be noise. It's the place to look first if the paragraph is revisited, e.g. alongside TASK-20's `llm_fallback` paragraph.

### After the runs

Two review findings came in after run 2:

- **Applied, not re-run:** pointing users to the analysis card is now limited to "a result that has them". An undetermined result, or an older one saved without `probabilities`, has no scores on the card. This only narrows a sentence that no run tested on such a result.
- **Deferred to TASK-20:** "they show which way it leans" doesn't match how the detector decides. It calls a pun from a confidence of about 0.32, so the tentative text is called a pun while its scores lean 0.66 to non-pun. Run 1's replies 7 and 16 say the classifier "leans toward" a pun. TASK-20 rewrites the neighbouring paragraph and needs its own live check, so the rewording and its re-run go there.
