import sys
import tempfile
import unittest
from pathlib import Path
from typing import Self
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from evaluate_dataset import (
    DatasetRow,
    EvaluationError,
    analyze_endpoint,
    evaluate,
    expected_output,
    fixture_analyzer,
    load_dataset,
    main,
    parse_args,
    validate_response,
)


def valid_response(**overrides: object) -> dict[str, object]:
    response: dict[str, object] = {
        "is_pun": False,
        "pun_type": None,
        "words_involved": [],
        "explanation": "No pun detected.",
        "confidence": 0.5,
        "sense_source": None,
    }
    response.update(overrides)
    return response


class EvaluateDatasetTests(unittest.TestCase):
    def _write_dataset(self, csv_body: str) -> Path:
        path = Path(self.enterContext(tempfile.TemporaryDirectory())) / "dataset.csv"
        path.write_text(csv_body, encoding="utf-8")
        return path

    def test_load_dataset_accepts_null_pun_type_for_non_pun_rows(self) -> None:
        path = self._write_dataset(
            "id,is_pun,pun_type,category,text\nhet_3,False,,general,No pun here.\n"
        )

        rows = load_dataset(path)

        self.assertEqual(rows, [DatasetRow("het_3", "No pun here.", False, None, "general")])

    def test_load_dataset_rejects_pun_type_set_on_non_pun_row(self) -> None:
        path = self._write_dataset(
            "id,is_pun,pun_type,category,text\nhet_3,False,homographic,general,No pun here.\n"
        )

        with self.assertRaises(EvaluationError):
            load_dataset(path)

    def test_load_dataset_rejects_missing_pun_type_on_pun_row(self) -> None:
        path = self._write_dataset("id,is_pun,pun_type,category,text\nhom_1,True,,general,A pun.\n")

        with self.assertRaises(EvaluationError):
            load_dataset(path)

    def test_load_dataset_rejects_missing_required_column(self) -> None:
        path = self._write_dataset("id,is_pun,pun_type,text\nhom_1,True,homographic,A pun.\n")

        with self.assertRaises(EvaluationError):
            load_dataset(path)

    def test_load_dataset_rejects_unparseable_is_pun(self) -> None:
        path = self._write_dataset(
            "id,is_pun,pun_type,category,text\nhom_1,maybe,,general,Unclear.\n"
        )

        with self.assertRaises(EvaluationError):
            load_dataset(path)

    def test_non_pun_projection_clears_source_pun_type(self) -> None:
        row = DatasetRow("1", "not a pun", False, "homographic", "food")

        self.assertEqual(expected_output(row), {"is_pun": False, "pun_type": None})

    def test_validate_response_rejects_non_pun_with_type(self) -> None:
        with self.assertRaises(EvaluationError):
            validate_response(valid_response(pun_type="homographic"))

    def test_validate_response_rejects_pun_without_type(self) -> None:
        with self.assertRaises(EvaluationError):
            validate_response(valid_response(is_pun=True, pun_type=None))

    def test_validate_response_rejects_non_object(self) -> None:
        with self.assertRaises(EvaluationError):
            validate_response(None)

    def test_validate_response_rejects_missing_contract_fields(self) -> None:
        with self.assertRaises(EvaluationError):
            validate_response({"is_pun": True, "pun_type": "homographic"})

    def test_fixture_analyzer_matches_gold_labels_and_contract(self) -> None:
        pun_row = DatasetRow("1", "a pun", True, "homographic", "food")
        non_pun_row = DatasetRow("2", "not a pun", False, None, "food")

        pun_response = validate_response(fixture_analyzer(pun_row))
        non_pun_response = validate_response(fixture_analyzer(non_pun_row))

        self.assertEqual(pun_response["is_pun"], True)
        self.assertEqual(pun_response["pun_type"], "homographic")
        self.assertEqual(non_pun_response["is_pun"], False)
        self.assertIsNone(non_pun_response["pun_type"])

    def test_evaluate_reports_binary_and_type_metrics(self) -> None:
        rows = [
            DatasetRow("1", "pun", True, "homographic", "food"),
            DatasetRow("2", "non-pun", False, "homographic", "food"),
            DatasetRow("3", "pun", True, "homophonic", "general"),
        ]

        def analyzer(row: DatasetRow) -> dict[str, object]:
            if row.row_id == "2":
                return valid_response(is_pun=True, pun_type="homographic")
            return valid_response(**expected_output(row))

        result = evaluate(rows, analyzer)

        self.assertEqual(result["request_errors"], [])
        self.assertEqual(result["slices"]["food_baseline"]["rows"], 2)
        self.assertEqual(result["slices"]["food_baseline"]["is_pun"]["false_positive"], 1)
        self.assertEqual(result["slices"]["all_categories"]["pun_type"]["support"], 2)
        self.assertEqual(result["slices"]["all_categories"]["pun_type"]["accuracy"], 1.0)

    def test_evaluate_records_analyzer_errors(self) -> None:
        rows = [DatasetRow("1", "pun", True, "homographic", "food")]

        def analyzer(_: DatasetRow) -> dict[str, object]:
            return valid_response(is_pun="unknown")

        result = evaluate(rows, analyzer)

        self.assertEqual(result["successful_rows"], 0)
        self.assertEqual(result["request_errors"][0]["id"], "1")

    def test_evaluate_food_baseline_slice_is_empty_when_no_food_rows(self) -> None:
        rows = [DatasetRow("1", "pun", True, "homographic", "general")]

        result = evaluate(rows, lambda row: valid_response(**expected_output(row)))

        food_slice = result["slices"]["food_baseline"]
        self.assertEqual(food_slice["rows"], 0)
        self.assertEqual(food_slice["coverage"], 0.0)
        self.assertEqual(food_slice["is_pun"]["support"], 0)
        self.assertEqual(food_slice["is_pun"]["precision"], 0.0)
        self.assertEqual(food_slice["is_pun"]["recall"], 0.0)

    def test_evaluate_food_baseline_slice_includes_animal_food_category(self) -> None:
        rows = [
            DatasetRow("1", "pun", True, "homographic", "food"),
            DatasetRow("2", "pun", True, "homophonic", "animal/food"),
            DatasetRow("3", "pun", True, "homographic", "animal"),
        ]

        result = evaluate(rows, lambda row: valid_response(**expected_output(row)))

        self.assertEqual(result["slices"]["food_baseline"]["rows"], 2)
        self.assertEqual(result["slices"]["all_categories"]["rows"], 3)


class AnalyzeEndpointTests(unittest.TestCase):
    def test_analyze_endpoint_wraps_http_error(self) -> None:
        with (
            patch(
                "evaluate_dataset.urlopen", side_effect=HTTPError("http://x", 500, "boom", {}, None)
            ),
            self.assertRaises(EvaluationError),
        ):
            analyze_endpoint("http://x", "text", 1.0)

    def test_analyze_endpoint_wraps_url_error(self) -> None:
        with (
            patch("evaluate_dataset.urlopen", side_effect=URLError("unreachable")),
            self.assertRaises(EvaluationError),
        ):
            analyze_endpoint("http://x", "text", 1.0)

    def test_analyze_endpoint_wraps_timeout(self) -> None:
        with (
            patch("evaluate_dataset.urlopen", side_effect=TimeoutError()),
            self.assertRaises(EvaluationError),
        ):
            analyze_endpoint("http://x", "text", 1.0)

    def test_analyze_endpoint_wraps_invalid_json(self) -> None:
        class FakeResponse:
            def __enter__(self) -> Self:
                return self

            def __exit__(self, *exc_info: object) -> None:
                return None

            def read(self) -> bytes:
                return b"not json"

        with (
            patch("evaluate_dataset.urlopen", return_value=FakeResponse()),
            self.assertRaises(EvaluationError),
        ):
            analyze_endpoint("http://x", "text", 1.0)


class MainCliTests(unittest.TestCase):
    def _write_dataset(self, csv_body: str) -> Path:
        path = Path(self.enterContext(tempfile.TemporaryDirectory())) / "dataset.csv"
        path.write_text(csv_body, encoding="utf-8")
        return path

    def test_parse_args_defaults(self) -> None:
        with patch.object(sys, "argv", ["evaluate_dataset.py"]):
            args = parse_args()

        self.assertFalse(args.fixture)
        self.assertEqual(args.timeout, 10.0)
        self.assertTrue(str(args.dataset).endswith("semeval2017_task7_puns.csv"))

    def test_main_fixture_mode_writes_output_and_returns_zero(self) -> None:
        dataset_path = self._write_dataset(
            "id,is_pun,pun_type,category,text\n"
            "hom_1,True,homographic,food,A pun.\n"
            "het_1,False,,food,Not a pun.\n"
        )
        output_path = dataset_path.with_name("result.json")

        argv = [
            "evaluate_dataset.py",
            "--fixture",
            "--dataset",
            str(dataset_path),
            "--output",
            str(output_path),
        ]
        with patch.object(sys, "argv", argv):
            exit_code = main()

        self.assertEqual(exit_code, 0)
        self.assertIn("dataset_rows", output_path.read_text(encoding="utf-8"))

    def test_main_reports_nonzero_exit_on_dataset_error(self) -> None:
        dataset_path = self._write_dataset(
            "id,is_pun,pun_type,text\nhom_1,True,homographic,A pun.\n"
        )

        with patch.object(
            sys, "argv", ["evaluate_dataset.py", "--fixture", "--dataset", str(dataset_path)]
        ):
            exit_code = main()

        self.assertEqual(exit_code, 1)


if __name__ == "__main__":
    unittest.main()
