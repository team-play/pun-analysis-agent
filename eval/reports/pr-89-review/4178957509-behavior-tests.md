# Comment 4178957509: Behavioral Tests

Comment: https://github.com/team-play/pun-analysis-agent/pull/89#discussion_r4178957509

Status: addressed; user approved publication. PR reviewer approval is pending.

## Request

Drop the pinned-value test because it only rejects intentional edits to a
constant and does not verify the claimed documentation synchronization.

## Update

- [test_scoring.py](../../../inference/tests/test_scoring.py): removed `test_margin_threshold_is_the_task_2_4_calibrated_value` and its misleading synchronization comment.
- Retained the threshold-boundary tests: exactly at the configured threshold passes, above it fails, and no signal fails. Existing large-margin and seeded-preference behavior tests remain.
- [test_calibrate_margin.py](../../../inference/tests/test_calibrate_margin.py): added eight tests for sentence/candidate weighting, eligible coverage and split filtering, cap/recall/ties, invalid dev input, conditional versus all-sentence reporting, independent normalized minima, Lesk-only filtering and dev-only selection/test reporting.
- No replacement test asserts a literal deployed threshold.

## Verification

Calibration/scoring/selection focused suite: 33 passed. Full inference: 101
passed (eight new tests minus the removed pinned test, from 94). Full Eval:
38 passed. Ruff lint and format checks passed. Independent review found no
essential behavioral-test gap.

## PR Reply

Removed the pinned-value test and its misleading documentation-sync comment. The existing boundary tests still verify that the configured threshold is inclusive, larger margins fail, and a missing signal fails. Instead of pinning the new value, I added eight behavioral calibration tests covering sentence-level weighting, coverage, dev/test separation, the FP cap and tie-breaking, invalid inputs, independent normalized minima, and embedding-Lesk-only filtering/reporting. The full inference suite passes with 101 tests, and no new test hard-codes the deployed threshold.