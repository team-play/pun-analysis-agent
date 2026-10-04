# Comment 4178957480: Threshold Rule

Comment: https://github.com/team-play/pun-analysis-agent/pull/89#discussion_r4178957480

Status: addressed; user approved publication. PR reviewer approval is pending.

## Request

The graceful-fallback argument favors fewer confident false positives, not the
increase from 0.03 to 0.05. State an explicit dev selection rule and align the
constant and design rationale with it.

## Update

- [calibrate_margin.py](../../../inference/scripts/calibrate_margin.py): added `choose_threshold()`, maximizing dev conditional sentence recall subject to `MAX_FP_RATE = 0.30`; ties prefer the smaller threshold. Missing eligible classes and no feasible grid point raise errors rather than silently selecting a value.
- The cap was set before recomputing corrected dev rates. The old grid failed the cap, so the dev grid was extended below 0.02 without changing the cap: `0, 0.005, 0.01, 0.015, 0.02, 0.03, 0.05, 0.08, 0.10, 0.15`.
- [scoring.py](../../../inference/scoring.py): changed `MARGIN_THRESHOLD` from 0.05 to the selected **0.01**. The comment points to the design document rather than duplicating rationale and results.
- [sense-selection.md](../../../docs/design/sense-selection.md): states the rule, provisional nature of the cap, fallback-first rationale, and coverage-adjusted results. The cap is a policy proposal for review, not an empirically optimal error budget.

## Verification

Dev at 0.01: 36/167 eligible non-pun sentences qualify (21.6%); 65/237
eligible homographic-pun sentences qualify (27.4%). The next grid point, 0.015,
has 30.5% false positives and fails the cap. At the previous 0.05, corrected
sentence-level false positives are 71.3%. Test at the dev-selected value is
47/170 (27.6%) false positives and 78/239 (32.6%) recall.

Behavioral tests cover cap enforcement, highest recall, tie-breaking, missing
classes and infeasible grids. Full inference: 101 passed; Eval: 38 passed;
Ruff lint/format passed. The recall cost and normalized alternative remain
explicit caveats, not hidden claims of optimality.

## PR Reply

Agreed: graceful fallback favors limiting confident misattributions, not raising the threshold. I replaced the rationale with an explicit dev-only rule: highest conditional sentence recall among flat-margin grid points with conditional non-pun sentence false positives at most 30%, breaking ties toward the smaller threshold. This provisional cap was set before recomputing the corrected rates; the old grid had no feasible point, so I extended it downward without relaxing the cap. It selects 0.01, now reflected in the constant and design doc: dev recall/FP are 27.4%/21.6%, and test reports 32.6%/27.6%. The docs explicitly flag the substantial recall cost and that the cap is a reviewable policy choice, not an optimality claim.