# TASK-2.3 Harness Validation Report

Date: 2026-09-22

Dataset: `eval/datasets/semeval2017_task7_puns.csv` at revision `824b22c` (4,030 rows; food baseline is 247 `food`/`animal/food` rows)

Command:

```bash
cd eval
uv run python evaluate_dataset.py --fixture
```

`--fixture` mode scores the harness against gold labels instead of a live `/analyze` call, so this is a self-validation of the harness (dataset loading, `/analyze` contract validation, and precision/recall/F1 math), not a classifier quality measurement. A live run against a real classifier is blocked on TASK-16 (owned separately, still In Progress) and TASK-9 (Backend's injectable client, not yet built).

All 4,030 rows scored successfully with zero request errors and 100% coverage on both slices.

## Results

| Slice | Rows | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| Food baseline (`food` + `animal/food`) | 247 | 1.0 | 1.0 | 1.0 |
| All categories | 4,030 | 1.0 | 1.0 | 1.0 |

Perfect scores are expected in fixture mode (the fixture echoes each row's own gold label back as the "prediction") and confirm the harness correctly parses the full dataset and computes metrics without error — they are not evidence of classifier quality. Once a real `/analyze` implementation exists (TASK-16), re-run with `--endpoint <url>` against it to get meaningful precision/recall numbers.

## Live run against PR #85's classifier

Date: 2026-10-02

Branch: `task-2.3-live-eval`, stacked on PR #85 (`review/pun-detector` @ `b5dd5f7`) — TASK-16's classifier, not yet merged to `main`.

Command:

```bash
cd inference
uv run uvicorn main:app --port 8000
# separate shell:
cd eval
uv run python evaluate_dataset.py --endpoint http://127.0.0.1:8000/analyze --timeout 30 --output task-2.3-live-run-results.json
```

All 4,030 rows scored successfully: 0 request errors, 0 undetermined, 100% response rate and detection coverage on both slices. Full output in `task-2.3-live-run-results.json` (gitignored, not committed — regenerate from the command above).

The harness's `animal_food` slice (`food` + `animal` + `animal/food`, 481 rows) is a superset of the fixture run's 247-row food-only baseline above — the harness was expanded to include the `animal` category since that earlier self-validation run (see `eval/README.md`).

`pun_type` is scored over detector true positives only (AC #2: gold `is_pun: true` *and* predicted `is_pun: true`) — support is 2,793 (all categories) / 342 (`animal_food`), lower than the 2,878 / 354 gold-positive rows, since the 85 / 12 detector false negatives have no predicted `pun_type` to grade.

| Slice | Rows | is_pun precision | is_pun recall | is_pun F1 | pun_type accuracy |
|---|---:|---:|---:|---:|---:|
| All categories | 4,030 | 0.900 | 0.970 | 0.934 | 0.764 |
| `animal_food` (`food` + `animal` + `animal/food`) | 481 | 0.893 | 0.966 | 0.928 | 0.751 |

`pun_type` F1 is lower on homophonic rows (0.723 all-categories) than homographic (0.795) — expected, since sense-selection's WordNet/Wiktionary pipeline only targets homographic puns (`docs/design/sense-selection.md`); homophonic classification rests solely on TASK-16's own phonetic signal. This satisfies AC #1 (a live run via the harness's injectable-client pattern against a real `/analyze`).
