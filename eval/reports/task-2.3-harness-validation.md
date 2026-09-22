# TASK-2.3 Harness Validation Report

Date: 2026-09-22

Dataset: `eval/datasets/semeval2017_task7_puns.csv` at revision `824b22c` (4,030 rows; food baseline is 247 `food`/`animal/food` rows)

Command:

```powershell
Push-Location eval
uv run python evaluate_dataset.py --fixture
Pop-Location
```

`--fixture` mode scores the harness against gold labels instead of a live `/analyze` call, so this is a self-validation of the harness (dataset loading, `/analyze` contract validation, and precision/recall/F1 math), not a classifier quality measurement. A live run against a real classifier is blocked on TASK-16 (owned separately, still In Progress) and TASK-9 (Backend's injectable client, not yet built).

All 4,030 rows scored successfully with zero request errors and 100% coverage on both slices.

## Results

| Slice | Rows | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| Food baseline (`food` + `animal/food`) | 247 | 1.0 | 1.0 | 1.0 |
| All categories | 4,030 | 1.0 | 1.0 | 1.0 |

Perfect scores are expected in fixture mode (the fixture echoes each row's own gold label back as the "prediction") and confirm the harness correctly parses the full dataset and computes metrics without error — they are not evidence of classifier quality. Once a real `/analyze` implementation exists (TASK-16), re-run with `--endpoint <url>` against it to get meaningful precision/recall numbers.
