"""Record the pinned ONNX export in detector.npz's metadata, keeping its weights (TASK-68).

compare.py shows the shipped weights give prototype-1's stored predictions on
scoring.EMBEDDING_REVISION. The artifact gets the `encoder_revision` field that
retrained artifacts already carry (scripts/train_detector.py), so one test checks
either kind against the pin. That replaces `encoder_history.runs_on`, which named
the revision TASK-55 checked, and `encoder_history.equivalence` now lists both checks.

Run once from inference/: uv run python ../docs/experiments/task-68/retag_artifact.py
"""

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
INFERENCE = HERE.parents[2] / "inference"
sys.path.insert(0, str(INFERENCE))

from pun_detector.model import ARTIFACT
from scoring import EMBEDDING_REVISION


def main():
    if not json.loads((HERE / "results.json").read_text())["passed"]:
        sys.exit("compare.py's gate didn't pass; don't retag")
    with np.load(ARTIFACT, allow_pickle=False) as data:
        arrays = {name: data[name] for name in data.files}
    metadata = json.loads(str(arrays["metadata"]))
    if "encoder_revision" in metadata:
        sys.exit("detector.npz already records an encoder_revision")

    metadata["encoder_revision"] = EMBEDDING_REVISION
    history = metadata["encoder_history"]
    del history["runs_on"]
    history["equivalence"] = [history["equivalence"], "docs/experiments/task-68"]
    arrays["metadata"] = np.array(json.dumps(metadata))
    np.savez_compressed(ARTIFACT, **arrays)

    with np.load(ARTIFACT, allow_pickle=False) as data:
        for name, array in arrays.items():
            if name != "metadata" and not np.array_equal(data[name], array):
                sys.exit(f"{name} changed while rewriting the artifact")
            if data[name].dtype != array.dtype:
                sys.exit(f"{name}'s dtype changed while rewriting the artifact")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
