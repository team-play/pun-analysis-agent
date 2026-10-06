# The shipped pun detector on the pinned ONNX export (TASK-68)

fastembed can't pin a revision of `qdrant/all-MiniLM-L6-v2-onnx`. It downloads the newest commit whenever its cache is empty (every image build, or a cleared local cache) and uses whatever is cached after that. That export has already changed once. [TASK-55](../task-55/README.md) checked the shipped `detector.npz` weights on `8f518e88`. Upstream pushed `d1395466` on 30 September 2026, and every Inference image built since has run it, but nobody checked the shipped weights on it. TASK-54's retraining on `d1395466` reproduced prototype-1, which is evidence about retrained weights, not the shipped ones.

This task pins the export to `d1395466` (`scoring.EMBEDDING_REVISION`) and checks the shipped weights on that commit.

## Why `d1395466`

The two commits differ in one file. `model.onnx`, `config.json`, `tokenizer_config.json`, `special_tokens_map.json` and `tokenizer.json`'s truncation (256 tokens) are identical. Only `tokenizer.json`'s `padding` changed, from a fixed length of 128 to the longest text in the batch, which upstream's commit message gives as the fix for batches of 129 to 256 tokens.

fastembed 0.8.1, which the lockfile has used since TASK-19, ignores that field anyway: `load_tokenizer` always enables batch-longest padding. So the change shouldn't move any embedding we compute, and pinning `d1395466` keeps production on the commit it already runs. Pinning `8f518e88` would roll production back to the tokenizer upstream called broken, which would be safe only while fastembed keeps overriding it.

## How it's checked

[`compare.py`](compare.py) runs the 605 test texts from [`test_predictions.jsonl`](../pun-detector/prototype-1/test_predictions.jsonl) through the shipped detector, embedding them the way `/analyze` does (`scoring.default_embed`, so the pinned commit). It saves [`results.json`](results.json).

The gate was fixed on 2026-10-05, before the first run: **none** of the 605 stored three-class predictions may change. The script also checks, as a sanity check rather than evidence, that the directory fastembed loaded is the pinned commit's snapshot; `default_embed` passes that directory by construction. This is stricter than TASK-55's gate, which allowed one coin-flip disagreement. That allowance covered swapping torch for ONNX; here the task asks for the same predictions. Identical predictions also mean identical test metrics, so the metrics aren't recomputed.

As a diagnostic that gates nothing, the script also runs the same texts on `8f518e88` and compares the two runs.

Run it from `inference/`. The first run downloads `8f518e88`'s tokenizer into fastembed's cache; `model.onnx` is the same blob in both commits, so it isn't downloaded twice.

```bash
uv run python ../docs/experiments/task-68/compare.py
```

Then, from the repo root, format the results the way the Lint workflow expects:

```bash
pnpm exec biome format --write docs/experiments/task-68/results.json
```

## Results

The gate passed.

| | Gate | Result |
|---|---|---|
| Loaded snapshot | the pinned commit | **`d1395466`** |
| Stored predictions reproduced | 605 of 605 | **605 of 605** |

The diagnostic against `8f518e88` confirms that fastembed's padding override makes the upstream change a no-op:

- **Predictions:** 0 of 605 differ.
- **Probabilities:** the largest difference in any class probability is exactly 0.
- **Embeddings:** across all 9,916 texts the detector embedded (sentences, contexts and WordNet glosses), the lowest cosine is 0.9999999. That is float32 rounding: identical probabilities need identical feature vectors.
- **Dockerfile drift check:** the baker sentence's confidence is 0.9491108 on both, within the check's 10⁻⁴ of 0.94911.

## What changed

- `scoring.default_embed` fetches the pinned commit with `huggingface_hub.snapshot_download` and loads it through fastembed's `specific_model_path`, because fastembed can't take a revision. Sense scoring, the detector, local runs and `scripts/train_detector.py` all go through it, so they all load the same commit. `huggingface_hub` was already installed as a fastembed dependency; it's now declared directly because `scoring.py` imports it.
- The Dockerfile downloads the same commit and files (`scoring.EMBEDDING_FILES`) with `hf download --revision`. The image runs with `HF_HUB_OFFLINE=1`, so if the Dockerfile and `scoring.py` name different commits, the build's first offline check fails: `snapshot_download` finds no cached listing for the pinned commit and raises `OfflineModeIsEnabled`. That failure was checked by building with `8f518e88` in the Dockerfile only. `tests/test_scoring.py` also compares the Dockerfile's `hf download` line with `scoring.py`, so the mismatch fails pytest before it reaches the Docker CI job.
- The model now comes from Hugging Face only. Before, fastembed fell back to a tarball on Google Cloud Storage when the Hub failed; `specific_model_path` skips that fallback, so it can't hand back a different export. A Hub outage, or the pinned commit disappearing upstream, fails image builds (once the download layer's cache is gone) and first local runs, loudly. Neither can silently change the model.
- [`retag_artifact.py`](retag_artifact.py) rewrote only `detector.npz`'s metadata. It added `encoder_revision`, the field retrained artifacts already record, removed `encoder_history.runs_on` (which named `8f518e88`), and made `encoder_history.equivalence` list both TASK-55 and this folder. In a retrained artifact, `encoder_revision` is the export its features were computed on. These weights were trained on torch (`encoder_history.trained_with`), so here it is the export they were checked on. The script checks that every array is unchanged, and the arrays were also compared byte for byte with the previous file.
- New tests make no network calls. `tests/test_pun_detector.py` fails if `detector.npz`'s `encoder_revision` and `scoring.EMBEDDING_REVISION` diverge. `tests/test_scoring.py` fails if `default_embed` stops passing the pinned commit and files to fastembed, if the revision isn't a full commit hash, if `EMBEDDING_SOURCE` isn't the export fastembed describes for `EMBEDDING_MODEL`, or if the Dockerfile bakes something else.
- The runtime image sets `HF_HUB_DISABLE_PROGRESS_BARS=1`: `snapshot_download`'s cache lookup otherwise prints a progress bar to every cold start's logs.
- `train_detector.encoder_revision()`, which read the commit from fastembed's private model directory, is gone: the trainer records `scoring.EMBEDDING_REVISION`, which is what it loads.

## Image and cold start

Measured locally on 2026-10-05, building `main` (`802a5c3`) and this change for `linux/amd64`, emulated on Apple silicon as in TASK-55, so only the comparison means anything. "Ready" is the time from `docker run` until `/health` answers, which includes loading the detector (the service loads it before binding its port). "First reply" is the first `/analyze` request after that, on the baker sentence. There were three alternating runs per image.

| | `main` | Pinned |
|---|---|---|
| Image, compressed | 350,913,628 B | 350,913,534 B |
| Baked model (`/fastembed_cache`) | 91,104,498 B | 91,103,745 B |
| Ready | 2.6 to 3.0 s | 2.6 to 2.8 s |
| First reply | 0.13 to 0.16 s | 0.13 to 0.15 s |

Both images bake the same five files from the same commit. The baked model is 753 bytes smaller: fastembed's own download also wrote a `files_metadata.json` (713 B) and a `refs/main` (40 B), which a download by commit hash doesn't need.
