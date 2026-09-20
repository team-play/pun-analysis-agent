# Eval

Data and evaluation tooling for the Data/Eval domain (dataset curation, detection precision/recall, sense-selection threshold calibration — see [`../docs/milestones/milestone-3.md`](../docs/milestones/milestone-3.md)).

## Datasets

### `datasets/semeval2017_task7_puns.csv`

An unmodified ingestion of the [SemEval-2017 Task 7](https://alt.qcri.org/semeval2017/task7/) pun corpus (Miller, Hempelmann, Gurevych), used for detection precision/recall and sense-selection calibration. SemEval released it as two separate corpora — one built around homographic puns, one around heterographic puns — and each corpus bundles both punning and non-punning text for the Subtask 1 (pun detection) task.

Columns:

| Column | Meaning |
|---|---|
| `id` | Original SemEval row id (`het_*` / `hom_*` prefix). |
| `is_pun` | `True`/`False` — whether the text contains a pun. |
| `pun_type` | `homographic` \| `homophonic` \| empty. Project contract vocabulary (see [`../docs/contracts.md`](../docs/contracts.md)) describing the pun's mechanism. **Empty whenever `is_pun` is `False`** — a non-pun has no mechanism to type, mirroring `docs/contracts.md`'s documented `sense_source: null` convention. SemEval's `heterographic` label is normalized to this project's `homophonic` (both mean sound-alike, different-spelling words; see [`../docs/design/sense-selection.md`](../docs/design/sense-selection.md)). |
| `source_corpus` | `homographic` \| `heterographic`. SemEval's own vocabulary, always present regardless of `is_pun`. Records which of SemEval's two source corpora the row was drawn from — this is provenance, not a claim about the row's pun mechanism. Do not use this column as a `pun_type` substitute for non-pun rows. |
| `category` | Coarse topic tag (`food`, `animal`, `general`, etc.) added during ingestion for domain-scoped subsetting (e.g. the food/animal-food baseline). Not part of the SemEval source data. |
| `text` | The sentence or short text. |

`pun_type` and `source_corpus` agree for every `is_pun: True` row (they're derived from the same SemEval corpus split); they diverge only on `is_pun: False` rows, where `pun_type` is empty and `source_corpus` still records origin.

License: SemEval-2017 Task 7 data is distributed by the task organizers for research use; see the [task page](https://alt.qcri.org/semeval2017/task7/) for terms.

### `datasets/sentences_animal.csv`, `datasets/sentences_food.csv`

Hand-authored sentence sets for a food/animal domain baseline (from [PR #8](https://github.com/team-play/pun-analysis-agent/pull/8)). This is a separate dataset from the food/animal rows already present in `semeval2017_task7_puns.csv` via its own `category` column — `TASK-2.2` covers verifying *that* SemEval-internal subset against the original ≥30-pair bar, not this file. No backlog task currently tracks this dataset or whether it should be integrated; that's an open question for review, not yet decided.

Columns follow the `semeval2017_task7_puns.csv` convention above, plus one extra:

| Column | Meaning |
|---|---|
| `id` | Row id, `animal_*` / `food_*` prefix per file (this project's own scheme; SemEval's `het_*`/`hom_*` prefixes don't apply here). |
| `is_pun` | `True`/`False`, as above. |
| `pun_type` | `homographic` \| `homophonic` \| empty, as above. |
| `source_corpus` | `sentences_animal` \| `sentences_food` — the originating file, mirroring how SemEval's `source_corpus` records which sub-corpus a row came from. |
| `category` | `animal` \| `food` — matches the file, since each file is domain-pure. |
| `text` | The sentence. |
| `pun_target` | The word the pun is built around (e.g. `otter`, `dough`). No SemEval equivalent; named `pun_target` rather than `word` to leave room for multi-word spans, though every value here is currently a single word. |
