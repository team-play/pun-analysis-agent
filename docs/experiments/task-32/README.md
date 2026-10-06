# Backend's timeouts, measured (TASK-32)

Two measurements, each setting or checking one of [`packages/timeouts/index.js`](../../../packages/timeouts/index.js)'s values: how long the ladder's Flash-Lite models go silent (`MODEL_STALL_LIMIT_MS`), and how long Inference's Cloud Run cold start takes (`INFERENCE_TIMEOUT_MS`).

## Flash-Lite silences

`MODEL_STALL_LIMIT_MS` ([`packages/timeouts/index.js`](../../../packages/timeouts/index.js)) cancels a model call that sends nothing for that long. It was a 30 s guess (TASK-42). This measures how long `/api/chat`'s Flash-Lite models actually go quiet, to check the guess against. `gemini-3.8-flash`, the ladder's last rung, isn't measured here: its free tier is 20 requests a day, shared with production. TASK-50 measures it, and until then the limit isn't lowered (decided with @yaisiel.torres, 2026-09-29).

### How it's measured

[`measure.mjs`](measure.mjs) runs Backend's own chat flow (`createChatFlow`, with the Inference fixture) in-process, once per model with that one model as its ladder, and with the settings production gives it (`GEMINI_MODEL_CONFIG`: `gemini-3.1-flash-lite` thinks at MEDIUM).

- **The stall limit is raised to 120 s during the run.** With production's 30 s, any silence longer than 30 s would be cut off and recorded only as a failure, so the slowest cases, the ones the limit exists for, would never be measured. An attempt that still went quiet for 120 s would be recorded as a stall and reported as a silence of at least 120 s. None did.
- **Each attempt is timed on its own, not the whole reply.** The stall guard times each attempt the ladder makes, so that's the sample. A whole reply's time would also count `analyze_pun`, backoff waits and failed attempts. The ladder is given refs to `timed/<model>` models the script registers, which forward to the real Gemini model and record when the attempt started, when each chunk arrived and when it ended. The ladder, stall guard and config run unchanged around them.
- **Three silences per attempt**, the three the stall guard times: start to first chunk, the longest gap between two chunks, and last chunk to the call ending.
- **Prompts:** TASK-38's five ([`../task-38`](../task-38/README.md)), with P5 sent as a follow-up to that run's own P4 reply, resent the way Frontend resends it. Each of 5 runs sends all five prompts to one model, then to the other (P5 needs that model's own P4), 5 s apart, so a model gets about 10 requests a minute during its turn, under Flash-Lite's 15.
- **Failed attempts** (Gemini's 503s) are counted but aren't samples: they come back at once, so their silence says nothing about the model.

Run it from the repo root, then summarize the saved run:

```bash
node --env-file=backend/.env.local docs/experiments/task-32/measure.mjs
```

```bash
node docs/experiments/task-32/summarize.mjs docs/experiments/task-32/runs/<file>.json
```

### Results

Run of 2026-09-29 10:12 UTC ([`runs/2026-09-29T10-12-09.489Z.json`](runs/2026-09-29T10-12-09.489Z.json)), 50 replies. A "first call" either asks for `analyze_pun` or answers without it (all of 3.5's follow-ups and one of 3.1's did); a call "after tool result" writes the reply; a follow-up's first call also carries P4 and its reply as history. "Attempts" counts the ones that answered.

| Model | Call | Attempts | Median first chunk | Slowest first chunk | Longest gap | Longest tail |
|---|---|---|---|---|---|---|
| `gemini-3.5-flash-lite` | first call | 20 | 0.8 s | 1.3 s | 0.1 s | 0.0 s |
| `gemini-3.5-flash-lite` | after tool result | 20 | 0.6 s | 1.0 s | 0.5 s | 0.0 s |
| `gemini-3.5-flash-lite` | first call (follow-up) | 5 | 0.7 s | 1.0 s | 0.2 s | 0.0 s |
| `gemini-3.1-flash-lite` | first call | 19 | 3.4 s | 7.0 s | 0.0 s | 0.0 s |
| `gemini-3.1-flash-lite` | after tool result | 23 | 2.6 s | 5.1 s | 14.8 s | 0.0 s |
| `gemini-3.1-flash-lite` | first call (follow-up) | 5 | 4.3 s | 6.0 s | 0.1 s | 0.0 s |

| Model | Longest silence of any kind | Failed attempts |
|---|---|---|
| `gemini-3.5-flash-lite` | 1.3 s | none |
| `gemini-3.1-flash-lite` | 14.8 s | 26 UNAVAILABLE |

- **`gemini-3.5-flash-lite`, the top rung, never went quiet for more than 1.3 s.**
- **`gemini-3.1-flash-lite` is slower to start, 2.6–4.3 s at the median.** That fits its MEDIUM thinking, though the stream can't show when it thinks: Backend doesn't ask Gemini for thought summaries (`includeThoughts`), so thinking is silent wherever it happens.
- **The longest silence was mid-reply, not before the first chunk.** In run 3's P5, 3.1's call after the tool result sent two text chunks by 2.7 s, then nothing for 14.8 s, then the rest of a normal, complete reply. So a call can pause after it starts streaming, perhaps to think.
- **3.1 answered 503 to 26 of its 73 attempts.** Run 5's P1 failed on all three, the only failed reply. In production, the ladder could have stepped down to Flash, retry budget permitting.

### Decision

**`MODEL_STALL_LIMIT_MS` stays at 30 s**, about twice the longest silence measured (14.8 s) and four times the slowest first chunk (7.0 s). One mid-reply pause in 47 `gemini-3.1-flash-lite` attempts shows that such pauses happen, not how often or how long they get, so the margin is generous: a 15 s limit would have left that healthy reply 0.2 s to spare. The limit isn't lowered until `gemini-3.8-flash` is measured (TASK-50), since one limit covers every rung, and TASK-45 saw Flash go past 30 s before its first chunk.

What the numbers can't say: 45–47 attempts per model is enough for a median and a worst case seen, not a p99. They come from one run of one prompt set, on the free tier.

## Inference's cold start

`INFERENCE_TIMEOUT_MS` bounds how long `analyze_pun` waits for Inference before returning the undetermined result. It was a 20 s guess (TASK-9). It has to cover a whole Cloud Run cold start: Inference scales to zero, and Backend's warm-up ping (TASK-53) doesn't always run before `analyze_pun` needs it.

### How it's measured

[`cold-start.mjs`](cold-start.mjs) calls the deployed service (revision `pun-agent-inference-00015-k8j`, with TASK-51's detector load and warm-up prediction at startup) from a laptop, signed in to gcloud as a project admin.

- **Scale to zero on its own.** Before each sample the script waits 20 minutes without calling Inference, so Cloud Run reclaims the idle instance as it does between real users, rather than forcing a new revision.
- **Only confirmed cold starts count.** About 90 s after each sample, the script reads Cloud Run's logs for an instance's `Application startup complete` line during the sample. Production traffic could have woken Inference during the wait. All 11 samples were cold starts.
- **Timed like `analyze_pun`'s timeout:** from sending `POST /analyze` until the whole body has arrived. The ID token is fetched before the clock starts. Backend's comes from the local metadata server, and its first warm-up ping creates the client and caches the token before `analyze_pun` needs it, so the token's share of the timeout is milliseconds.
- **Five scenarios:** (a) one `/analyze` on its own, what the timeout must cover; (b) 3 parallel `/analyze` calls, which start their timeouts together while Inference (one instance, concurrency 1) answers one at a time; (c) TASK-53's `/health` ping, then `/analyze` 5 s later, about when Gemini's first turn asks for it; (d) and (e), (a) and (b) with 2,000-character texts of words with many senses, the slowest texts [TASK-55](../task-55/README.md) found. The detector caches senses and embeddings per word, so the three dense texts share no words.

Run it from the repo root with the scenarios to take, one letter per sample:

```bash
node docs/experiments/task-32/cold-start.mjs a,b,a,c,a
```

### Results

Three runs on 2026-10-06, 08:45–13:50 UTC ([`runs/cold-start-2026-10-06T08-45-15.365Z.json`](runs/cold-start-2026-10-06T08-45-15.365Z.json), [`runs/cold-start-2026-10-06T10-34-16.913Z.json`](runs/cold-start-2026-10-06T10-34-16.913Z.json), [`runs/cold-start-2026-10-06T13-05-04.428Z.json`](runs/cold-start-2026-10-06T13-05-04.428Z.json) for the dense texts). Sorted slowest first, across all three. "Cloud Run" is the request's latency in Cloud Run's own request log, for the request that waited on the cold start.

| Scenario | Waking request (laptop) | Cloud Run | `/analyze` (laptop) |
|---|---|---|---|
| (e) 3 parallel, dense | 22.4 s | 20.7 s to start up, then 1.0–1.5 s per text | 22.4, 23.4, **24.5 s** |
| (d) unassisted, dense | 16.5 s | 16.1 s | 16.5 s |
| (a) unassisted | 15.9 s | 15.4 s | 15.9 s |
| (b) 3 parallel | 15.6 s | 15.4 s | 15.6, 15.7, 15.8 s |
| (a) unassisted | 11.5 s | 11.2 s | 11.5 s |
| (a) unassisted | 10.6 s | 10.1 s | 10.6 s |
| (a) unassisted | 9.7 s | 9.4 s | 9.7 s |
| (a) unassisted | 9.6 s | 9.3 s | 9.6 s |
| (c) after `/health` ping | 9.2 s (the ping) | 8.4 s | 4.3 s |
| (c) after `/health` ping | 6.6 s (the ping) | 6.4 s | 1.7 s |
| (b) 3 parallel | 6.2 s | 5.8 s | 6.2, 6.4, 6.3 s |

- **A cold start takes 6–22 s, 10.6 s at the median, with a long tail:** 3 of 11 took about 15.5–16.5 s, and one instance took 20.7 s just to start up, before reading any text. Cloud Run's request logs for 2026-10-04 show two more on revision `00007`, from before TASK-51: 12.8 s and 14.4 s.
- **Long texts add little:** a dense 2,000-character text takes about 1–1.5 s to analyze even with the caches empty, against about 0.1 s for a short one. The startup, not the text, is what varies.
- **The laptop adds 0.2–0.8 s** (0.3–0.5 s on the unassisted samples) over Cloud Run's own latency (connection setup and the round trip to us-east1). Backend runs in us-east1, so it sees a little less: the laptop numbers err on the safe side.
- **Parallel calls queue for one analysis each.** Cloud Run holds them until the instance is up, then Inference answers them one at a time: with short texts the last finished within about 0.2 s of the first, with dense texts about 2 s after it.
- **The warm-up ping helps when it runs:** the ping absorbs the cold start, leaving `/analyze` 1.7–4.3 s to wait.

### Decision

**`INFERENCE_TIMEOUT_MS` is 24 s**, decided with @yaisiel.torres. It covers every single call measured, 22.4 s at worst, and is about 1.5× the typical slow cold start (about 16 s), but not 1.5× the slowest: that would be about 34 s. 20 s would have failed that 22.4 s call.

24 s accepts that a rare slow cold start degrades to the undetermined result instead of waiting it out. In the samples, that's the last of three parallel dense calls after the 20.7 s startup (24.5 s). It takes Inference having scaled to zero, Backend's warm-up ping not having run (when it does, it starts the cold start 3–7 s early), and a slow startup, all at once. When it happens, Gemini judges the text itself (TASK-20), the reply still arrives, and the next call finds Inference warm. Raising the timeout far enough to cover it would make every pun question wait longer when Inference is down, and at 34 s would leave room for only one retry of a stalled model call (below).

Raising it from 20 s lengthens `MAX_SILENCE_MS` from 50 s to 54 s, so `FRONTEND_SILENCE_LIMIT_MS` went from 75 s to 79 s with it, in the same change rather than ahead of it ([`engineering-practices.md`](../../engineering-practices.md)'s deploy order): that's safe while Frontend doesn't enforce the limit yet (TASK-28), and it shrinks `RETRY_BUDGET_MS` from 80 s to 68 s. That still fits two retries of a call that stalls the full 30 s (63.75 s with their backoff waits), so the ladder retries exactly as it did at 20 s; above about 25 s, only one would fit.

What the numbers can't say: 11 cold starts, on one day, are enough for a range and a worst case seen, not a p99: the 20.7 s startup came in the last run, so the tail may be longer still. Re-measure if Inference's startup changes (a bigger model, more data loaded at startup) or its memory or CPU settings do.
