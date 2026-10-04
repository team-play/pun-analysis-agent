# PR #89 Review Updates

Review: yaitorr, 2026-10-04 19:16 UTC, against commit `81b772f`.

All seven new inline comments are addressed in this revision. The user approved
publication on 2026-10-04; PR reviewer approval remains pending. The user handled
the review replies; the assistant did not post replies. Unrelated local user
documents are excluded from this revision.

| Comment | Report |
|---|---|
| 4178957480: threshold rationale and selection rule | [4178957480-threshold-rule.md](4178957480-threshold-rule.md) |
| 4178957489: sentence-level false positives and coverage | [4178957489-sentence-denominators.md](4178957489-sentence-denominators.md) |
| 4178957495: omitted ranking and Lesk-only scope | [4178957495-measurement-scope.md](4178957495-measurement-scope.md) |
| 4178957501: duplicated comment and review history | [4178957501-code-comment.md](4178957501-code-comment.md) |
| 4178957509: remove pinned-value test | [4178957509-behavior-tests.md](4178957509-behavior-tests.md) |
| 4178957515: soften generalization claim | [4178957515-test-claims.md](4178957515-test-claims.md) |
| 4178957519: remove session-relative wording | [4178957519-report-wording.md](4178957519-report-wording.md) |

Each report ends with one paragraph ready to copy into its review thread.
The review's top-level summary is covered by these seven reports. The earlier
round is not re-reported here because this review explicitly accepts those
changes, apart from the pinned test now removed.

## Calibration Decision

The provisional rule, set before recomputing corrected dev rates, maximizes
conditional sentence recall over the flat-margin grid subject to at most 30%
conditional non-pun sentence false positives, breaking ties toward smaller
thresholds. The original grid had no feasible point. Extending it on dev,
without relaxing the cap, selects **0.01**, replacing 0.05.

| Split | Eligible non-pun | Eligible homographic-pun | Conditional FP | Conditional recall | All-sentence FP | All-sentence recall |
|---|---:|---:|---:|---:|---:|---:|
| Dev | 167/173 | 237/241 | 21.6% | 27.4% | 20.8% | 27.0% |
| Test | 170/173 | 239/241 | 27.6% | 32.6% | 27.2% | 32.4% |

These are embedding-Lesk reading-availability metrics, not word accuracy or
end-to-end production metrics. The recall cost is substantial. The cap is a
reviewable policy choice, not a measured optimum. The normalized dev sweep
also warrants further investigation; it is not ruled out. Earlier exploratory
runs exposed all rows/test, so this test split is not a pristine confirmation.

## Verification

- Corrected live calibration: `uv run --directory inference python scripts/calibrate_margin.py` completed; dev chooses 0.01 and test is reported at that single value.
- Focused calibration/scoring/selection suite: 33 passed.
- Full inference suite: 101 passed, with two pre-existing dependency deprecation warnings.
- Eval suite: 38 passed. Run `uv run --directory eval python -m unittest discover -s tests`.
- Inference and Eval Ruff lint and format checks passed after repairing an import-order issue.
- Editor diagnostics found no errors in the script, new tests, or scoring module.
- Independent read-only code review found no behavioral defect or essential test gap; its cap-chronology and line-ending findings were corrected.

No contract, service topology, dependency, or deployment target changed.

## Reproduction

```powershell
uv run --directory inference python scripts/calibrate_margin.py
uv run --directory inference pytest -q
uv run --directory eval python -m unittest discover -s tests
uv run --directory inference ruff check .
uv run --directory inference ruff format --check .
uv run --directory eval ruff check .
uv run --directory eval ruff format --check .
```