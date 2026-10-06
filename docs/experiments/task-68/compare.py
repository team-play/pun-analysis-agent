"""Does the shipped pun detector still predict the same on the pinned ONNX export? (TASK-68)

TASK-55 checked detector.npz's weights on qdrant/all-MiniLM-L6-v2-onnx@8f518e88; upstream
then pushed d1395466, which production has run since, and scoring.py now pins. This runs
the 605-text test split of docs/experiments/pun-detector/prototype-1 through the shipped
detector exactly as /analyze embeds (scoring.default_embed, so the pinned revision), and
checks it against the gate fixed on 2026-10-05 before the first run (see README.md). As
a diagnostic, it also runs the same texts on 8f518e88 and compares the two.

Run from inference/ (downloads 8f518e88's tokenizer into fastembed's cache on the first
run; model.onnx is the same file in both revisions):

    uv run python ../docs/experiments/task-68/compare.py
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
from fastembed import TextEmbedding
from fastembed.common.utils import define_cache_dir
from huggingface_hub import snapshot_download

HERE = Path(__file__).resolve().parent
PROTOTYPE = HERE.parent / "pun-detector" / "prototype-1"
INFERENCE = HERE.parents[2] / "inference"
sys.path.insert(0, str(INFERENCE))

import scoring
from pun_detector.features import EMBED_BATCH_SIZE, FeatureExtractor, onnx_embed
from pun_detector.model import PunDetector

CLASSES = ("non_pun", "homographic", "homophonic")
# The gate, fixed before the first run: the task asks for the same predictions, so none
# of the 605 stored three-class predictions may change.
MAX_CHANGED = 0
# What TASK-55 verified and detector.npz recorded until this task.
PREVIOUS_REVISION = "8f518e882455312b086101e60691f5e6e2f05c3c"
# The Dockerfile's drift check: the baker sentence's confidence, measured in TASK-55.
BAKER = "The baker needed more dough."
BAKER_CONFIDENCE = 0.94911


def previous_embed():
    """onnx_embed, but on PREVIOUS_REVISION instead of the pinned export."""
    model_dir = snapshot_download(
        scoring.EMBEDDING_SOURCE,
        revision=PREVIOUS_REVISION,
        cache_dir=define_cache_dir(),
        allow_patterns=["*.json", "model.onnx"],
    )
    encoder = TextEmbedding(scoring.EMBEDDING_MODEL, specific_model_path=model_dir)

    def embed(texts):
        vectors = np.asarray(
            list(encoder.embed(list(texts), batch_size=EMBED_BATCH_SIZE)), dtype=np.float32
        )
        return vectors / np.linalg.norm(vectors, axis=1, keepdims=True)

    return embed


def recording(embed, seen):
    """Wrap `embed` to keep every vector it returns, for the cosine diagnostic."""

    def wrapped(texts):
        vectors = embed(texts)
        seen.update(zip(texts, vectors, strict=True))
        return vectors

    return wrapped


def predict_all(embed, texts):
    seen = {}
    detector = PunDetector(extractor=FeatureExtractor(embed=recording(embed, seen)))
    start = time.perf_counter()
    predictions = [detector.predict(text) for text in texts]
    baker = detector.predict(BAKER)["confidence"]
    return predictions, seen, baker, time.perf_counter() - start


def label(prediction):
    return prediction["pun_type"] if prediction["is_pun"] else "non_pun"


def main():
    rows = [json.loads(line) for line in (PROTOTYPE / "test_predictions.jsonl").open()]
    texts = [row["text"] for row in rows]

    pinned, pinned_vectors, pinned_baker, pinned_seconds = predict_all(onnx_embed, texts)
    # The directory fastembed actually loaded, named by commit: proves the pin took effect.
    loaded_revision = Path(scoring._embedder.model._model_dir).name
    previous, previous_vectors, previous_baker, previous_seconds = predict_all(
        previous_embed(), texts
    )

    changed = [
        {"ids": row["ids"], "text": row["text"], "stored": row["prediction"], "pinned": label(p)}
        for row, p in zip(rows, pinned, strict=True)
        if label(p) != row["prediction"]
    ]
    shared = sorted(pinned_vectors.keys() & previous_vectors.keys())
    cosines = np.array([float(pinned_vectors[t] @ previous_vectors[t]) for t in shared])
    probability_gaps = np.array(
        [
            abs(a["probabilities"][c] - b["probabilities"][c])
            for a, b in zip(pinned, previous, strict=True)
            for c in CLASSES
        ]
    )

    checks = {
        "pinned_revision_loaded": loaded_revision == scoring.EMBEDDING_REVISION,
        "predictions_unchanged": len(changed) <= MAX_CHANGED,
    }
    result = {
        "gate": {"max_changed_predictions": MAX_CHANGED},
        "passed": all(checks.values()),
        "checks": checks,
        "pinned_revision": f"{scoring.EMBEDDING_SOURCE}@{scoring.EMBEDDING_REVISION}",
        "loaded_revision": loaded_revision,
        "texts": len(rows),
        "matches_stored_predictions": len(rows) - len(changed),
        "changed": changed,
        "diagnostics": {
            "previous_revision": f"{scoring.EMBEDDING_SOURCE}@{PREVIOUS_REVISION}",
            "predictions_differing_from_previous": sum(
                label(a) != label(b) for a, b in zip(pinned, previous, strict=True)
            ),
            "embedded_texts_compared": len(shared),
            "min_cosine": float(cosines.min()),
            "max_class_probability_gap": float(probability_gaps.max()),
            "baker_confidence": {
                "dockerfile_expects": BAKER_CONFIDENCE,
                "pinned": pinned_baker,
                "previous": previous_baker,
            },
            "pinned_seconds": round(pinned_seconds, 1),
            "previous_seconds": round(previous_seconds, 1),
        },
    }
    (HERE / "results.json").write_text(json.dumps(result, indent="\t") + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
