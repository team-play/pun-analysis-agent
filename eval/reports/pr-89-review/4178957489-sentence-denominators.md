# Comment 4178957489: Sentence Denominators

Comment: https://github.com/team-play/pun-analysis-agent/pull/89#discussion_r4178957489

Status: addressed; user approved publication. PR reviewer approval is pending.

## Request

Compute false positives from each non-pun sentence's minimum margin, just as
recall does for homographic-pun sentences. Report eligible negative coverage
and reselect the threshold using corrected dev rates.

## Update

- [calibrate_margin.py](../../../inference/scripts/calibrate_margin.py): replaced pooled `negative_margins` with grouped `negative_observations`. Both `_flat_scores()` sides count one qualifying minimum per sentence.
- `collect()` separately tracks all gold non-pun and homographic-pun sentence totals and their eligible-reading groups. Homophonic rows are outside these calibration denominators.
- `_report_coverage()` shows eligible/total counts for both classes. `report_at_threshold()` reports both conditional rates and rates over all gold sentences, treating uncovered positives as misses and uncovered negatives as non-qualifying.
- The normalized sweep also independently minimizes `margin * sense_count` for each sentence on both sides; it does not reuse the raw-margin winner.
- [test_calibrate_margin.py](../../../inference/tests/test_calibrate_margin.py): the counterexample has two negative sentences, one with three candidates. One qualifies, so FP is 50%, not one out of four candidates. Adding another non-qualifying candidate cannot dilute that rate.

## Verification

| Split | Negative coverage | Positive coverage | Conditional FP | Conditional recall | All-negative FP | All-positive recall |
|---|---:|---:|---:|---:|---:|---:|
| Dev, 0.01 | 167/173 | 237/241 | 36/167 = 21.6% | 65/237 = 27.4% | 36/173 = 20.8% | 65/241 = 27.0% |
| Test, 0.01 | 170/173 | 239/241 | 47/170 = 27.6% | 78/239 = 32.6% | 47/173 = 27.2% | 78/241 = 32.4% |

The corrected calibration completed. Eight new calibration tests cover
aggregation, coverage, split identity, normalized minima, selection and scope;
full inference has 101 passing tests. These negative rates are a sense-reading
false-positive proxy, not the detector's FP rate or a full production metric.

## PR Reply

Fixed: both false positives and recall now count sentences, using the minimum eligible embedding-Lesk margin in each sentence; candidate-rich negatives can no longer dilute the false-positive rate. The normalized comparison independently minimizes its score per sentence too. The script reports both classes' coverage: dev has 167/173 eligible non-puns and 237/241 eligible homographic puns, while test has 170/173 and 239/241. At the reselected 0.01, conditional FP/recall are 21.6%/27.4% on dev and 27.6%/32.6% on test; all-gold-sentence rates are also printed. A regression test specifically checks that adding candidates to one sentence cannot change its weight.