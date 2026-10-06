# Gemini's replies when analyze_pun leaves the explanation to it (TASK-20)

When sense selection finds no confident sense pair, `/analyze` returns `sense_source: "llm_fallback"` with an empty `explanation`, and Gemini has to explain the pun itself. When Inference can't judge the text at all, it returns the undetermined result (`is_pun: null`), and Gemini decides whether the text is a pun. Backend's system instruction says how to handle both (`FALLBACK_RULE` in [`backend/src/flows/system-instruction.ts`](../../../backend/src/flows/system-instruction.ts)). This checks that a production model follows it.

## How it's checked

[`check.mjs`](check.mjs) runs Backend's own chat flow (`createChatFlow`, the real system instruction and `analyze_pun` tool) in this process, with one pinned Flash-Lite model and an Inference stand-in that answers each case's `/analyze` result. Each case is one user turn, `Is this a pun? <text>`:

| Case | Text | What Inference answers |
|---|---|---|
| homographic, right guess | Why did the scarecrow win an award? He was outstanding in his field. | `llm_fallback`, `words_involved: ["outstanding"]` |
| homographic, wrong guess | I used to be a banker but I lost interest. | `llm_fallback`, `words_involved: ["banker"]` (what main's Inference answers; the pun is on *interest*) |
| homophonic, no words | A bicycle can't stand on its own because it is two tired. | `llm_fallback`, `pun_type: "homophonic"`, `words_involved: []` |
| undetermined | Time flies like an arrow; fruit flies like a banana. | the undetermined result |
| detector false positive | We had a picnic on the river bank. | `llm_fallback`, `words_involved: ["picnic"]` (what main's Inference answers; not a pun) |

The stand-in results leave out `probabilities`, which Inference also sends; `FALLBACK_RULE` doesn't use them. A run is about 10 requests (each reply calls the tool, then answers), one case every 15 s, well within AGENTS.md's Gemini quota rules. It stops at the first 429.

Run it from the repo root, with `GEMINI_MODEL` set to one Flash-Lite model in `backend/.env.local`:

```bash
node --env-file=backend/.env.local docs/experiments/task-20/check.mjs
```

The run is saved as `runs/<start time>.json`, with every reply.

## Grading

Fixed before any reply was read. A reply **follows** the guidance when it does all of these that apply to its case:

- **Picks the word itself:** names the word(s) that actually carry the pun, not the classifier's guess when that guess is wrong (*interest*, not *banker*), and finds the sound-alike words for the homophonic case (*two tired* / *too tired*).
- **Gives two meanings** (or, for the homophonic case, the words it sounds like).
- **Owns the reading:** presents it as its own reading. It doesn't say the tool or a dictionary confirmed it, and for the undetermined case doesn't imply the tool judged the text.
- **Allows for a wrong verdict:** for the false positive, says the text likely isn't a pun (or that the wordplay is weak at most), instead of inventing a pun.
- **No field names:** never mentions `sense_source`, `llm_fallback`, `words_involved` or `is_pun`.

Otherwise it **misses**, with the rule it broke. A reply that didn't call `analyze_pun` is recorded as **no tool call**, since the guidance never reached it.

## Results

### Run 1: first wording

Run of 2026-10-06 00:16 UTC on `gemini-3.5-flash-lite` ([`runs/2026-10-06T00-16-19.223Z.json`](runs/2026-10-06T00-16-19.223Z.json)): 10 requests, no failures, and every reply called `analyze_pun` once.

| Case | Grade | What the reply did |
|---|---|---|
| homographic, right guess | follows | *outstanding*: standing out in a field, and excellent at the job |
| homographic, wrong guess | follows | named *interest*, not the classifier's *banker*; bank interest and curiosity; "Even though the tool couldn't pull a dictionary match for it" |
| homophonic, no words | follows | found *two tired* / *too tired* itself |
| undetermined | follows | decided it's a pun on *like* (preposition vs verb) with *flies* as noun vs verb, without mentioning the tool |
| detector false positive | follows | "That isn't actually a pun!": only the river sense of *bank* is in play |

5 of 5 follow the guidance. Beyond the scale:

- Only the wrong-guess reply says the reading is its own. The others don't credit the tool, but don't sound less certain either ("Yes, that is definitely a pun"), so TASK-20's AC #2 ("presented as a lower-confidence reading") is only partly visible here.
- The undetermined reply calls the *time flies* sentence a homographic pun, though it turns on syntax, and quotes the pivot word as "likes".

### Run 2: "say in a few words that this reading is your own"

To make AC #2's lower-confidence reading visible, run 2 replaced "present it as your own reading, not one the dictionaries confirmed" with "say in a few words that this reading is your own, since the dictionaries couldn't confirm it". Run of 2026-10-06 00:26 UTC on `gemini-3.5-flash-lite` ([`runs/2026-10-06T00-26-52.407Z.json`](runs/2026-10-06T00-26-52.407Z.json)): 10 requests, no failures, and every reply called `analyze_pun` once.

| Case | Grade | What the reply did |
|---|---|---|
| homographic, right guess | follows | *outstanding*, both meanings; "this reading is my own" |
| homographic, wrong guess | follows | *interest*, not *banker*; "I cracked this one open myself" |
| homophonic, no words | follows | *two tired* / *too tired*; "My dictionaries didn't have this one in stock, so I cracked open this reading myself" |
| undetermined | follows | decided itself, on *like* and *flies*, without mentioning the tool |
| detector false positive | **misses** (allows for a wrong verdict) | called it a homographic pun on *bank* (river side vs. financial institution, "as if you were eating your meal right on top of a pile of money"), opening with "That's punny!" |

4 of 5. Every pun reply now says the reading is its own, but the false positive regressed: the new sentence asks for an explanation before the paragraph says the classifier can be wrong, so the model treats llm_fallback as "explain a pun". One run per case is a small sample, but run 1 got this case right with the weaker wording.

### Run 3: verdict first

To undo run 2's regression, run 3 moved "the classifier can be wrong, and if it isn't one, say so" ahead of the explanation steps ("First check that the text really is a pun ... If it is, work out ..."), keeping run 2's "say in a few words that this reading is your own". This is the wording in `FALLBACK_RULE`. Run of 2026-10-06 00:30 UTC on `gemini-3.5-flash-lite` ([`runs/2026-10-06T00-30-54.225Z.json`](runs/2026-10-06T00-30-54.225Z.json)): 10 requests, no failures, and every reply called `analyze_pun` once.

| Case | Grade | What the reply did |
|---|---|---|
| homographic, right guess | follows | *outstanding*, both meanings; no "my own reading" |
| homographic, wrong guess | follows | *interest*, not *banker*; no "my own reading" |
| homophonic, no words | follows | *two tired* / *too tired*; "My dictionaries couldn't confirm this one, so that analysis is my own!" |
| undetermined | follows | decided itself (a garden-path sentence on *flies* and *like*), without mentioning the tool; again quotes "likes" |
| detector false positive | **misses** (allows for a wrong verdict) | a homographic pun on *bank* ("The word carrying the pun is actually **bank** rather than picnic"), hedged: "I figured it out myself!" |

4 of 5.

### Across the three runs

| | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Follows (of 5) | 5 | 4 | 4 |
| Pun replies that say the reading is their own (of 4) | 1 | 4 | 2 |
| False positive caught | yes | no | no |

Steady in every run: the model replaces a wrong guess with the right word, finds homophonic sound-alikes itself, decides undetermined texts without crediting the tool, and never mentions field names. Saying the reading is its own, and catching the false positive, vary between runs of nearly the same wording, so one reply per case can't separate the wordings from run-to-run variation. The false positive works against the detector's verdict (`is_pun: true` at 0.97), which detection alone owns (docs/contracts.md): the model usually finds a reading to match it. Run 3's reply still meets TASK-20's AC #2 as written (two senses, presented as its own reading), but not this scale's stricter "allows for a wrong verdict". 30 requests in all, on 2026-10-06.


## Decision and possible follow-up

`FALLBACK_RULE` ships with run 3's wording, the most complete of the three: check the verdict first, then the word, both meanings, and say the reading is your own. One change came after run 3 and wasn't re-run: run 3 told Gemini that llm_fallback means the classifier "couldn't confirm two meanings in its dictionaries", and the homophonic reply repeated it ("My dictionaries couldn't confirm this one"). But homophonic puns reach llm_fallback without any dictionary lookup (sense selection skips them), so the shipped wording says the classifier "didn't explain it from its dictionaries" and that "the dictionaries didn't supply it", and that words_involved is always empty for homophonic puns. More work may still be worthwhile if the eval shows it matters. One reply per case can't tell the wordings apart, so a comparison worth acting on needs several replies per case and wording (about 90 requests for 3 × 5 × 3, split across days per AGENTS.md's quota rules). Detector false positives are better caught by the detector itself than by this paragraph.
