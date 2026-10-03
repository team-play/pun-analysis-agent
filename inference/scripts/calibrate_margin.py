"""TASK-2.4: calibrate scoring.MARGIN_THRESHOLD against the SemEval eval dataset.

Runs every row of eval/datasets/semeval2017_task7_puns.csv through the
sense-selection pipeline (candidates -> context -> senses -> scoring) and
collects embedding-Lesk margins:
  - per-candidate margins on is_pun:false rows -- every candidate here is a
    confirmed non-pun word, so this is the false-positive distribution.
  - per-sentence minimum margins on homographic is_pun:true rows -- the
    sentence's best candidate, giving a sentence-level recall distribution.

Run from inference/:
    uv run python scripts/calibrate_margin.py
"""

from __future__ import annotations

import csv
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from candidates import extract_candidates, get_model
from context import local_contexts
from scoring import default_embed, pun_margin, score_senses
from senses import get_candidate_senses

DATASET = Path(__file__).resolve().parent.parent.parent / "eval/datasets/semeval2017_task7_puns.csv"


@dataclass(frozen=True)
class Observation:
    row_id: str
    is_pun: bool
    pun_type: str | None
    lemma: str
    margin: float
    sense_count: int


def observe(row_id: str, is_pun: bool, pun_type: str | None, text: str) -> list[Observation]:
    """Embedding-Lesk margin for every candidate word with 2+ senses in `text`."""
    doc = get_model()(text)
    candidates = extract_candidates(doc)
    contexts = local_contexts(doc, candidates)
    observations = []
    for candidate, local_context in zip(candidates, contexts):
        senses = get_candidate_senses(candidate)
        if len(senses) < 2:
            continue
        relation, predicate = local_context.relation, local_context.predicate
        scored = score_senses(senses, text, predicate, relation, default_embed)
        signal = pun_margin(scored, default_embed)
        if signal is None or signal.method != "embedding_lesk":
            continue
        observations.append(
            Observation(row_id, is_pun, pun_type, candidate.lemma, signal.margin, len(senses))
        )
    return observations


def main() -> None:
    with DATASET.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    negative_margins: list[Observation] = []
    positive_sentence_minimums: list[tuple[str, float, int]] = []

    for index, row in enumerate(rows):
        is_pun = row["is_pun"].strip().lower() == "true"
        pun_type = (row.get("pun_type") or "").strip() or None
        observations = observe(row["id"], is_pun, pun_type, row["text"])

        if not is_pun:
            negative_margins.extend(observations)
        elif pun_type == "homographic" and observations:
            best = min(observations, key=lambda o: o.margin)
            positive_sentence_minimums.append((row["id"], best.margin, best.sense_count))

        if (index + 1) % 500 == 0:
            print(f"...{index + 1}/{len(rows)} rows", file=sys.stderr)

    negative_margins.sort(key=lambda o: o.margin)
    positive_sentence_minimums.sort(key=lambda triple: triple[1])

    print(f"non-pun candidate observations: {len(negative_margins)}")
    print(f"homographic-pun sentence observations: {len(positive_sentence_minimums)}")

    for percentile in (1, 5, 10, 25, 50):
        index = max(0, min(len(negative_margins) - 1, len(negative_margins) * percentile // 100))
        if negative_margins:
            print(f"non-pun candidate margin p{percentile}: {negative_margins[index].margin:.4f}")

    for percentile in (10, 25, 50, 75, 90):
        index = max(
            0,
            min(
                len(positive_sentence_minimums) - 1,
                len(positive_sentence_minimums) * percentile // 100,
            ),
        )
        if positive_sentence_minimums:
            print(
                f"homographic-pun sentence-min margin p{percentile}: "
                f"{positive_sentence_minimums[index][1]:.4f}"
            )

    print(f"negative margin/sense_count correlation: {_correlation(negative_margins):.3f}")
    print(
        "positive sentence-min margin/sense_count correlation: "
        f"{_correlation_pairs(positive_sentence_minimums):.3f}"
    )

    print("-- flat margin threshold --")
    for threshold in (0.02, 0.03, 0.05, 0.08, 0.1, 0.15):
        false_positive_rate = (
            sum(1 for o in negative_margins if o.margin <= threshold) / len(negative_margins)
            if negative_margins
            else 0.0
        )
        recall = (
            sum(1 for _, margin, _ in positive_sentence_minimums if margin <= threshold)
            / len(positive_sentence_minimums)
            if positive_sentence_minimums
            else 0.0
        )
        print(f"threshold={threshold:.2f}  fp_rate={false_positive_rate:.3f}  recall={recall:.3f}")

    print("-- sense-count-normalized threshold (margin * sense_count) --")
    for threshold in (0.1, 0.2, 0.3, 0.5, 0.8, 1.2):
        false_positive_rate = (
            sum(1 for o in negative_margins if o.margin * o.sense_count <= threshold)
            / len(negative_margins)
            if negative_margins
            else 0.0
        )
        recall = (
            sum(
                1
                for _, margin, sense_count in positive_sentence_minimums
                if margin * sense_count <= threshold
            )
            / len(positive_sentence_minimums)
            if positive_sentence_minimums
            else 0.0
        )
        print(f"threshold={threshold:.2f}  fp_rate={false_positive_rate:.3f}  recall={recall:.3f}")


def _correlation(observations: list[Observation]) -> float:
    return _pearson([o.margin for o in observations], [o.sense_count for o in observations])


def _correlation_pairs(triples: list[tuple[str, float, int]]) -> float:
    return _pearson([margin for _, margin, _ in triples], [count for _, _, count in triples])


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
