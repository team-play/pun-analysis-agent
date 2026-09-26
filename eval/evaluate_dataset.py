"""Evaluate an /analyze implementation against the SemEval CSV dataset."""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ALLOWED_PUN_TYPES = {"homographic", "homophonic"}
ALLOWED_SENSE_SOURCES = {"wordnet", "wiktionary", "llm_fallback"}
REQUIRED_COLUMNS = {"id", "is_pun", "pun_type", "category", "text"}


class EvaluationError(ValueError):
    """Raised when a dataset row or analyzer response violates the contract."""


@dataclass(frozen=True)
class DatasetRow:
    row_id: str
    text: str
    is_pun: bool
    pun_type: str | None
    category: str


def _parse_bool(value: str, row_id: str) -> bool:
    normalized = value.strip().lower()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    raise EvaluationError(f"row {row_id}: is_pun must be True or False, got {value!r}")


def load_dataset(path: Path) -> list[DatasetRow]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        columns = set(reader.fieldnames or [])
        missing = REQUIRED_COLUMNS - columns
        if missing:
            raise EvaluationError(f"dataset is missing columns: {sorted(missing)}")

        rows: list[DatasetRow] = []
        for raw in reader:
            row_id = (raw.get("id") or "").strip()
            if not row_id:
                raise EvaluationError("dataset contains a row without an id")
            is_pun = _parse_bool(raw.get("is_pun", ""), row_id)
            pun_type = (raw.get("pun_type") or "").strip() or None
            if is_pun and pun_type not in ALLOWED_PUN_TYPES:
                raise EvaluationError(
                    f"row {row_id}: pun_type must be homographic or homophonic, got {pun_type!r}"
                )
            if not is_pun and pun_type is not None:
                raise EvaluationError(
                    f"row {row_id}: pun_type must be empty when is_pun is False, got {pun_type!r}"
                )
            rows.append(
                DatasetRow(
                    row_id=row_id,
                    text=raw.get("text", ""),
                    is_pun=is_pun,
                    pun_type=pun_type,
                    category=(raw.get("category") or "").strip(),
                )
            )
    return rows


def expected_output(row: DatasetRow) -> dict[str, Any]:
    """Project a dataset row into the contract's expected-output shape."""

    return {
        "is_pun": row.is_pun,
        "pun_type": row.pun_type if row.is_pun else None,
    }


def validate_response(response: Any) -> dict[str, Any]:
    if not isinstance(response, dict):
        raise EvaluationError("response must be a JSON object")
    required_fields = {
        "is_pun",
        "pun_type",
        "words_involved",
        "explanation",
        "confidence",
        "sense_source",
    }
    missing_fields = required_fields - response.keys()
    if missing_fields:
        raise EvaluationError(f"response is missing fields: {sorted(missing_fields)}")
    is_pun = response.get("is_pun")
    if is_pun is not None and not isinstance(is_pun, bool):
        raise EvaluationError(f"response is_pun must be a boolean or null, got {is_pun!r}")
    pun_type = response.get("pun_type")
    if pun_type is not None and (
        not isinstance(pun_type, str) or pun_type not in ALLOWED_PUN_TYPES
    ):
        raise EvaluationError(f"response has invalid pun_type: {pun_type!r}")
    if not is_pun and pun_type is not None:
        raise EvaluationError("response must use pun_type=null unless is_pun is true")
    if is_pun and pun_type is None:
        raise EvaluationError("response must set pun_type when is_pun is true")
    words_involved = response.get("words_involved")
    if not isinstance(words_involved, list) or not all(
        isinstance(word, str) for word in words_involved
    ):
        raise EvaluationError("response words_involved must be a list of strings")
    if not isinstance(response.get("explanation"), str):
        raise EvaluationError("response explanation must be a string")
    confidence = response.get("confidence")
    if is_pun is None:
        if confidence is not None:
            raise EvaluationError("response must use confidence=null when is_pun is null")
    elif (
        isinstance(confidence, bool)
        or not isinstance(confidence, (int, float))
        or not 0 <= confidence <= 1
    ):
        raise EvaluationError("response confidence must be a number between 0 and 1")
    sense_source = response.get("sense_source")
    if sense_source is not None and sense_source not in ALLOWED_SENSE_SOURCES:
        raise EvaluationError(f"response has invalid sense_source: {sense_source!r}")
    if not is_pun and sense_source is not None:
        raise EvaluationError("response must use sense_source=null unless is_pun is true")
    if is_pun is None and (words_involved or response["explanation"]):
        raise EvaluationError(
            "response must use words_involved=[] and explanation='' when is_pun is null"
        )
    return response


def analyze_endpoint(endpoint: str, text: str, timeout: float) -> dict[str, Any]:
    payload = json.dumps({"text": text}).encode("utf-8")
    request = Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise EvaluationError(f"request failed: {exc}") from exc
    if not isinstance(body, dict):
        raise EvaluationError("response must be a JSON object")
    return validate_response(body)


def fixture_analyzer(row: DatasetRow) -> dict[str, Any]:
    """Return gold labels to validate the evaluator pipeline without a service.

    words_involved/explanation are placeholders that satisfy the /analyze contract
    shape; they are not a semantically meaningful prediction of which words form
    the pun, since the dataset doesn't label that.
    """

    return {
        **expected_output(row),
        "words_involved": [row.pun_type] if row.is_pun and row.pun_type else [],
        "explanation": "Fixture response.",
        "confidence": 1.0,
        "sense_source": None,
    }


def _binary_metrics(actual: Iterable[bool], predicted: Iterable[bool]) -> dict[str, float | int]:
    actual_values = list(actual)
    predicted_values = list(predicted)
    tp = sum(real and guess for real, guess in zip(actual_values, predicted_values))
    fp = sum(not real and guess for real, guess in zip(actual_values, predicted_values))
    fn = sum(real and not guess for real, guess in zip(actual_values, predicted_values))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "support": len(actual_values),
        "true_positive": tp,
        "false_positive": fp,
        "false_negative": fn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }


def _type_metrics(rows: list[DatasetRow], predictions: list[dict[str, Any]]) -> dict[str, Any]:
    pun_rows = [index for index, row in enumerate(rows) if row.is_pun]
    result: dict[str, Any] = {"support": len(pun_rows)}
    for pun_type in sorted(ALLOWED_PUN_TYPES):
        actual = [rows[index].pun_type == pun_type for index in pun_rows]
        predicted = [predictions[index].get("pun_type") == pun_type for index in pun_rows]
        result[pun_type] = _binary_metrics(actual, predicted)
    result["accuracy"] = (
        sum(rows[index].pun_type == predictions[index].get("pun_type") for index in pun_rows)
        / len(pun_rows)
        if pun_rows
        else 0.0
    )
    return result


def _slice_report(outcomes: list[tuple[DatasetRow, dict[str, Any] | None]]) -> dict[str, Any]:
    """Summarize precision/recall/F1 for one slice of (row, prediction) outcomes.

    A prediction of None means the analyzer call for that row failed; those rows
    count toward `rows` and `request_errors` but are excluded from the metrics.

    An undetermined prediction (is_pun: null) is a valid answer, not a failure.
    `is_pun` and `pun_type` are scored over determined rows only, with
    `detection_coverage` reporting how many rows were determined, so a detector
    can't look better by answering undetermined more often. `is_pun_end_to_end`
    scores undetermined as "not a pun" instead, which is what a chat user sees.
    """

    answered = [(row, prediction) for row, prediction in outcomes if prediction is not None]
    determined = [
        (row, prediction) for row, prediction in answered if prediction["is_pun"] is not None
    ]
    determined_rows = [row for row, _ in determined]
    determined_predictions = [prediction for _, prediction in determined]
    row_count = len(outcomes)
    answered_count = len(answered)
    return {
        "rows": row_count,
        "successful_rows": answered_count,
        "request_errors": row_count - answered_count,
        "response_rate": answered_count / row_count if row_count else 0.0,
        "undetermined_rows": answered_count - len(determined),
        "detection_coverage": len(determined) / answered_count if answered_count else 0.0,
        "is_pun": _binary_metrics(
            (row.is_pun for row in determined_rows),
            (prediction["is_pun"] for prediction in determined_predictions),
        ),
        "is_pun_end_to_end": _binary_metrics(
            (row.is_pun for row, _ in answered),
            (prediction["is_pun"] is True for _, prediction in answered),
        ),
        "pun_type": _type_metrics(determined_rows, determined_predictions),
    }


def evaluate(
    rows: list[DatasetRow], analyzer: Callable[[DatasetRow], dict[str, Any]]
) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    outcomes: list[tuple[DatasetRow, dict[str, Any] | None]] = []
    successful_rows: list[DatasetRow] = []
    successful_predictions: list[dict[str, Any]] = []
    for row in rows:
        try:
            prediction = validate_response(analyzer(row))
        except (EvaluationError, OSError) as exc:
            errors.append({"id": row.row_id, "error": str(exc)})
            outcomes.append((row, None))
            continue
        outcomes.append((row, prediction))
        successful_rows.append(row)
        successful_predictions.append(prediction)

    animal_food_outcomes = [
        (row, prediction)
        for row, prediction in outcomes
        if row.category in {"food", "animal", "animal/food"}
    ]
    return {
        "dataset_rows": len(rows),
        "successful_rows": len(successful_rows),
        "request_errors": errors,
        "slices": {
            "animal_food": _slice_report(animal_food_outcomes),
            "all_categories": _slice_report(outcomes),
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path(__file__).with_name("datasets") / "semeval2017_task7_puns.csv",
    )
    parser.add_argument(
        "--endpoint", default=os.environ.get("PUN_ANALYZE_URL", "http://localhost:8000/analyze")
    )
    parser.add_argument("--timeout", type=float, default=10.0)
    parser.add_argument(
        "--fixture", action="store_true", help="Use gold labels to validate the evaluator pipeline"
    )
    parser.add_argument("--output", type=Path, help="Write JSON results to this path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        rows = load_dataset(args.dataset)
        analyzer = (
            fixture_analyzer
            if args.fixture
            else lambda row: analyze_endpoint(args.endpoint, row.text, args.timeout)
        )
        result = evaluate(rows, analyzer)
    except (EvaluationError, OSError) as exc:
        print(f"evaluation failed: {exc}", file=sys.stderr)
        return 1

    rendered = json.dumps(result, indent=2, sort_keys=True)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0 if not result["request_errors"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
