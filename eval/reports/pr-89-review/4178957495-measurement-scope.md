# Comment 4178957495: Measurement Scope

Comment: https://github.com/team-play/pun-analysis-agent/pull/89#discussion_r4178957495

Status: addressed; user approved publication. PR reviewer approval is pending.

## Request

Disclose omitted detector ranking and state that the metrics cover only
embedding-Lesk readings, not overall production behavior or pun-word accuracy.

## Update

- [calibrate_margin.py](../../../inference/scripts/calibrate_margin.py): module docstring explains why `preferred` is omitted and why candidate ordering does not affect whether any inspected reading passes. Word-level accuracy cannot be checked because the CSV has no pun-word label.
- The scope warning also notes the candidate-set limit: without `preferred`, only the first 32 candidates are inspected; detector-ranked extras on long inputs are not covered.
- `_report_coverage()` prints an embedding-Lesk-only/not-end-to-end warning alongside the dev sweep and both split reports.
- [sense-selection.md](../../../docs/design/sense-selection.md): excludes selectional-preference readings, including margin-zero readings, and labels the results reading availability rather than correct explanations. It distinguishes the sense-selection negative proxy from detector FP rates.
- [test_calibrate_margin.py](../../../inference/tests/test_calibrate_margin.py): mocked mixed-method readings verify selectional-preference is excluded, `threshold=math.inf` is used, and `preferred` is omitted; a report test checks the output scope warning.

## Verification

The corrected live calibration prints the scope warning with its results.
Eight calibration tests and the full 101-test inference suite pass. Detector
ordering was not added, and this revision makes no word-accuracy or overall
production-recall claim.

## PR Reply

Added the scope notes to the script docstring, printed results, and design doc. Detector ranking (`preferred`) is intentionally omitted because order does not change whether any inspected reading passes, but it does determine the word production explains; this dataset has no pun-word labels, so word-level accuracy is not measured. I also disclose the first-32-candidate limit without preferred. The reported rates are explicitly embedding-Lesk-only: selectional-preference readings, including margin-zero readings, are excluded, so these are reading-availability metrics rather than overall production recall or explanation correctness. Tests now check the method exclusion and printed warning.