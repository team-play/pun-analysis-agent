"""TASK-2.4: calibrate scoring.MARGIN_THRESHOLD against the SemEval eval dataset.

Runs the detector's dev and test rows (docs/experiments/pun-detector/prototype-1/
splits.json) through selection.pun_readings() -- production's actual
sense-selection pipeline, not a reconstruction from candidates/context/senses/
scoring directly (PR #89's original version did that, which PR #93 found
measured filters production doesn't apply; see docs/design/sense-selection.md).
Calling pun_readings() with threshold=math.inf applies its other three filters
(positive runner-up score, no shared WordNet word, dissimilar glosses) while
leaving every margin visible, regardless of size.

Train rows are skipped entirely: the detector was fit on them, so they say
nothing about how a threshold generalizes. Dev is for sweeping thresholds;
test is reported once, at the threshold actually chosen, never used to pick
it (same split discipline as the detector's own evaluation).

For each split, collects:
  - per-candidate margins on is_pun:false rows -- every candidate here is a
    confirmed non-pun word, so this is the false-positive distribution.
  - per-sentence minimum margins on homographic is_pun:true rows -- the
    sentence's best candidate, giving a sentence-level recall distribution.

Run from inference/:
    uv run python scripts/calibrate_margin.py
"""

from __future__ import annotations

import csv
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from candidates import get_model
from scoring import MARGIN_THRESHOLD, default_embed
from selection import pun_readings
from senses import get_candidate_senses

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATASET = REPO_ROOT / "eval/datasets/semeval2017_task7_puns.csv"
SPLITS = REPO_ROOT / "docs/experiments/pun-detector/prototype-1/splits.json"


@dataclass(frozen=True)
class Observation:
    row_id: str
    is_pun: bool
    pun_type: str | None
    lemma: str
    margin: float
    sense_count: int


def observe(row_id: str, is_pun: bool, pun_type: str | None, text: str) -> list[Observation]:
    """Embedding-Lesk margin for every reading production's other filters let through.

    threshold=math.inf so pun_readings() only applies its non-margin filters;
    every candidate that clears those is visible here regardless of margin.
    """
    doc = get_model()(text)
    observations = []
    for reading in pun_readings(doc, default_embed, threshold=math.inf):
        if reading.signal.method != "embedding_lesk":
            continue
        sense_count = len(get_candidate_senses(reading.candidate))
        observations.append(
            Observation(
                row_id,
                is_pun,
                pun_type,
                reading.candidate.lemma,
                reading.signal.margin,
                sense_count,
            )
        )
    return observations


@dataclass
class SplitData:
    negative_margins: list[Observation]
    # Every reading for each homographic-pun sentence, not just one "best" --
    # the flat and normalized schemes can disagree on which candidate is best
    # for a given sentence, so each analysis below picks its own minimum.
    positive_observations: list[list[Observation]]


def collect(rows: list[dict[str, str]], row_ids: set[str]) -> SplitData:
    data = SplitData(negative_margins=[], positive_observations=[])
    wanted = [row for row in rows if row["id"] in row_ids]
    for index, row in enumerate(wanted):
        is_pun = row["is_pun"].strip().lower() == "true"
        pun_type = (row.get("pun_type") or "").strip() or None
        observations = observe(row["id"], is_pun, pun_type, row["text"])

        if not is_pun:
            data.negative_margins.extend(observations)
        elif pun_type == "homographic" and observations:
            data.positive_observations.append(observations)

        if (index + 1) % 200 == 0:
            print(f"...{index + 1}/{len(wanted)} rows", file=sys.stderr)
    data.negative_margins.sort(key=lambda o: o.margin)
    return data


def report_sweep(data: SplitData) -> None:
    """Full percentile/correlation/threshold-sweep report, for picking a threshold on dev."""
    raw_margin_minimums = sorted(
        (min(sentence, key=lambda o: o.margin) for sentence in data.positive_observations),
        key=lambda o: o.margin,
    )

    print(f"non-pun candidate observations: {len(data.negative_margins)}")
    print(f"homographic-pun sentence observations: {len(data.positive_observations)}")

    for percentile in (1, 5, 10, 25, 50):
        negative_margins = data.negative_margins
        index = max(0, min(len(negative_margins) - 1, len(negative_margins) * percentile // 100))
        if negative_margins:
            print(f"non-pun candidate margin p{percentile}: {negative_margins[index].margin:.4f}")

    for percentile in (10, 25, 50, 75, 90):
        index = max(
            0, min(len(raw_margin_minimums) - 1, len(raw_margin_minimums) * percentile // 100)
        )
        if raw_margin_minimums:
            print(
                f"homographic-pun sentence-min margin p{percentile}: "
                f"{raw_margin_minimums[index].margin:.4f}"
            )

    print(f"negative margin/sense_count correlation: {_correlation(data.negative_margins):.3f}")
    print(
        "positive sentence-min margin/sense_count correlation: "
        f"{_correlation(raw_margin_minimums):.3f}"
    )

    print("-- flat margin threshold --")
    for threshold in (0.02, 0.03, 0.05, 0.08, 0.1, 0.15):
        fp_rate, recall = _flat_scores(data, raw_margin_minimums, threshold)
        print(f"threshold={threshold:.2f}  fp_rate={fp_rate:.3f}  recall={recall:.3f}")

    print("-- sense-count-normalized threshold (margin * sense_count) --")
    normalized_minimums = [
        min(o.margin * o.sense_count for o in sentence) for sentence in data.positive_observations
    ]
    for threshold in (0.1, 0.2, 0.3, 0.5, 0.8, 1.2):
        fp_rate = (
            sum(1 for o in data.negative_margins if o.margin * o.sense_count <= threshold)
            / len(data.negative_margins)
            if data.negative_margins
            else 0.0
        )
        recall = (
            sum(1 for normalized in normalized_minimums if normalized <= threshold)
            / len(normalized_minimums)
            if normalized_minimums
            else 0.0
        )
        print(f"threshold={threshold:.2f}  fp_rate={fp_rate:.3f}  recall={recall:.3f}")


def _flat_scores(
    data: SplitData, raw_margin_minimums: list[Observation], threshold: float
) -> tuple[float, float]:
    fp_rate = (
        sum(1 for o in data.negative_margins if o.margin <= threshold) / len(data.negative_margins)
        if data.negative_margins
        else 0.0
    )
    recall = (
        sum(1 for o in raw_margin_minimums if o.margin <= threshold) / len(raw_margin_minimums)
        if raw_margin_minimums
        else 0.0
    )
    return fp_rate, recall


def report_at_threshold(data: SplitData, threshold: float) -> None:
    """The single fp_rate/recall pair at an already-chosen threshold, for reporting on test."""
    raw_margin_minimums = [
        min(sentence, key=lambda o: o.margin) for sentence in data.positive_observations
    ]
    fp_rate, recall = _flat_scores(data, raw_margin_minimums, threshold)
    print(f"non-pun candidate observations: {len(data.negative_margins)}")
    print(f"homographic-pun sentence observations: {len(data.positive_observations)}")
    print(f"threshold={threshold:.2f}  fp_rate={fp_rate:.3f}  recall={recall:.3f}")


def main() -> None:
    with DATASET.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    splits = json.loads(SPLITS.read_text(encoding="utf-8"))

    print("== DEV (tune here) ==")
    dev = collect(rows, set(splits["dev"]))
    report_sweep(dev)

    print(f"\n== TEST (report only, at the chosen MARGIN_THRESHOLD={MARGIN_THRESHOLD}) ==")
    test = collect(rows, set(splits["test"]))
    report_at_threshold(test, MARGIN_THRESHOLD)


def _correlation(observations: list[Observation]) -> float:
    return _pearson([o.margin for o in observations], [o.sense_count for o in observations])


def _pearson(xs: list[float], ys: list[float]) -> float:
    n = len(xs)
    if n < 2:
        return 0.0
    mean_x, mean_y = sum(xs) / n, sum(ys) / n
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    var_x = sum((x - mean_x) ** 2 for x in xs)
    var_y = sum((y - mean_y) ** 2 for y in ys)
    denominator = (var_x * var_y) ** 0.5
    return cov / denominator if denominator else 0.0


if __name__ == "__main__":
    main()
