# Comment 4178957501: Code Comment

Comment: https://github.com/team-play/pun-analysis-agent/pull/89#discussion_r4178957501

Status: addressed; user approved publication. PR reviewer approval is pending.

## Request

Replace duplicated calibration results/review history in the threshold comment
with a short pointer. Remove inaccurate PR history from the script docstring.

## Update

- [scoring.py](../../../inference/scoring.py): replaced the long rationale/table/history comment with a three-line pointer to the calibration script, dev/test methodology, and design document's open questions.
- [calibrate_margin.py](../../../inference/scripts/calibrate_margin.py): removed the attribution to PR #93 and the narrative about the earlier reconstruction. The docstring now describes current behavior and limitations instead.
- [sense-selection.md](../../../docs/design/sense-selection.md) is the canonical location for current numbers and rationale; the code comment has no numerical results to drift apart.
- Historical data exposure is still disclosed as a methodological limitation, not as a review narrative or a false pristine-holdout claim.

## Verification

Full inference suite: 101 passed. Inference Ruff lint and formatting pass.
Independent review's LF normalization finding was fixed. This comment cleanup
does not alter behavior; the threshold change belongs to comment 4178957480.

## PR Reply

Shortened the threshold comment to a three-line pointer to the calibration script and the design doc's numbers, scope, and rationale. It no longer duplicates the result tables or review history. I also removed the incorrect PR #93 attribution and reconstruction-history narrative from the script docstring, which now describes the current calibration behavior. The prior data-exposure caveat remains because it affects interpretation of the test results, rather than serving as review history in code.