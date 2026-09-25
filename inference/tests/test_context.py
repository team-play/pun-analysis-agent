import pytest

from candidates import CandidateWord, extract_candidates
from context import LocalContext, local_contexts


def test_obj_relation_dough_needs_example():
    text = "The baker needed more dough."
    candidates = extract_candidates(text)
    dough_candidate = next(c for c in candidates if c.text == "dough")
    result = local_contexts(text, [dough_candidate])
    assert result == [LocalContext(relation="dobj", predicate="need")]


def test_nsubj_relation_batter_was_ready_example():
    text = "The batter was ready."
    candidates = extract_candidates(text)
    batter_candidate = next(c for c in candidates if c.text == "batter")
    result = local_contexts(text, [batter_candidate])
    assert result == [LocalContext(relation="nsubj", predicate="be")]


def test_root_candidate_has_no_predicate():
    text = "Run!"
    candidates = extract_candidates(text)
    run_candidate = next(c for c in candidates if c.text == "Run")
    result = local_contexts(text, [run_candidate])
    assert result == [LocalContext(relation="ROOT", predicate=None)]


def test_mismatched_candidate_raises_instead_of_silently_returning_wrong_token():
    text = "The baker needed more dough."
    # Same index (4) as "dough" in the sentence above, but for a word that
    # isn't actually there -- simulates a candidate from a different text.
    bogus_candidate = CandidateWord(text="wallet", lemma="wallet", pos="NOUN", index=4)

    with pytest.raises(ValueError, match="does not match token"):
        local_contexts(text, [bogus_candidate])


def test_batch_call_parses_once_for_multiple_candidates(monkeypatch):
    import candidates as candidates_module

    text = "The baker needed more dough."
    candidates = extract_candidates(text)

    parse_count = 0
    real_model = candidates_module.get_model()
    original_call = type(real_model).__call__

    def counting_call(self, *args, **kwargs):
        nonlocal parse_count
        parse_count += 1
        return original_call(self, *args, **kwargs)

    monkeypatch.setattr(type(real_model), "__call__", counting_call)

    local_contexts(text, candidates)

    assert parse_count == 1
