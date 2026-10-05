import math

import numpy as np
import pytest

import selection
from candidates import get_model
from context import LocalContext
from scoring import PunSignal, ScoredSense
from selection import pun_readings, select_senses
from senses import Sense

# A real parse, so candidate order and local contexts are spaCy's. "baker"
# (nsubj of need) has no seeded slot, so it's scored by embedding-Lesk;
# "dough" (dobj of need) fills a seeded slot, so selectional preference.
SENTENCE = "The baker needed more dough."
BAKER, DOUGH = 1, 4

BAKER_PERSON = Sense("someone who bakes bread or cake", (), "noun.person", "wordnet")
BAKER_OVEN = Sense("a portable oven for baking", (), "noun.artifact", "wordnet")
DOUGH_FOOD = Sense(
    "a flour mixture stiff enough to knead or roll", ("food",), "noun.food", "wordnet"
)
DOUGH_MONEY = Sense(
    "informal terms for money", ("medium of exchange",), "noun.possession", "wordnet"
)
CHEDDAR_CHEESE = Sense(
    "hard smooth-textured cheese; originally made in Cheddar in southwestern England",
    (),
    "noun.food",
    "wordnet",
)
CHEDDAR_MONEY = Sense("Money, cash, currency.", (), None, "wiktionary")


@pytest.fixture
def doc():
    return get_model()(SENTENCE)


@pytest.fixture
def senses(monkeypatch):
    """Senses by lemma, so each test decides which candidates have any; no WordNet lookups."""
    by_lemma = {}
    monkeypatch.setattr(selection, "get_candidate_senses", lambda c: by_lemma.get(c.lemma, []))
    monkeypatch.setattr(selection, "alternative_lemmas", lambda candidate, sense: None)
    return by_lemma


def embed_with(baker_person, baker_oven):
    """Fake embedding: the sentence points along x, so a gloss's Lesk score is its x-share."""
    table = {
        SENTENCE: [1.0, 0.0, 0.0],
        BAKER_PERSON.gloss: baker_person,
        BAKER_OVEN.gloss: baker_oven,
        DOUGH_FOOD.gloss: [0.0, 1.0, 0.0],
        DOUGH_MONEY.gloss: [0.0, 0.0, 1.0],
    }
    return lambda texts: [np.array(table[text]) for text in texts]


# Both baker senses score cos 45 deg = 0.707 against the sentence, and are orthogonal.
TIED = embed_with([1.0, 1.0, 0.0], [1.0, -1.0, 0.0])


def words(readings):
    return [reading.candidate.text for reading in readings]


def test_two_distinct_senses_that_fit_equally_well_are_a_reading(doc, senses):
    senses["baker"] = [BAKER_PERSON, BAKER_OVEN]

    [reading] = pun_readings(doc, TIED)

    assert reading.candidate.index == BAKER
    assert reading.signal.margin == pytest.approx(0.0)
    assert reading.signal.method == "embedding_lesk"


def test_a_margin_above_the_threshold_is_a_reading_only_once_the_threshold_allows_it(doc, senses):
    # Oven fits better (0.894 vs 0.707), so the margin is about 0.187.
    senses["baker"] = [BAKER_PERSON, BAKER_OVEN]
    embed = embed_with([1.0, 1.0, 0.0], [1.0, -0.5, 0.0])

    assert list(pun_readings(doc, embed)) == []
    [reading] = pun_readings(doc, embed, threshold=math.inf)
    assert reading.signal.margin == pytest.approx(0.187, abs=1e-3)


def test_two_senses_that_both_fit_badly_are_not_a_reading(doc, senses):
    # Equal scores, so margin 0, but both are negative: a tie in not fitting.
    senses["baker"] = [BAKER_PERSON, BAKER_OVEN]
    embed = embed_with([-1.0, 1.0, 0.0], [-1.0, -1.0, 0.0])

    assert list(pun_readings(doc, embed)) == []


@pytest.mark.parametrize(
    ("person_words", "oven_words", "is_reading"),
    [
        (frozenset({"cook"}), frozenset({"cook", "range"}), False),
        (frozenset({"cook"}), frozenset({"range"}), True),
        # A sense WordNet can't resolve gives no answer, so it can't veto the pair.
        (frozenset({"cook"}), None, True),
    ],
    ids=["share a word", "share none", "one unknown"],
)
def test_senses_that_share_another_word_are_not_a_reading(
    doc, senses, monkeypatch, person_words, oven_words, is_reading
):
    senses["baker"] = [BAKER_PERSON, BAKER_OVEN]
    lemmas = {BAKER_PERSON: person_words, BAKER_OVEN: oven_words}
    monkeypatch.setattr(selection, "alternative_lemmas", lambda candidate, sense: lemmas[sense])

    assert words(pun_readings(doc, TIED)) == (["baker"] if is_reading else [])


def test_near_identical_glosses_are_not_a_reading_even_in_different_lexfiles(doc, senses):
    # Both score 0.707 against the sentence, but the glosses' cosine is 0.9.
    senses["baker"] = [BAKER_PERSON, BAKER_OVEN]
    embed = embed_with([1.0, 1.0, 0.0], [1.0, 0.8, 0.6])

    assert list(pun_readings(doc, embed)) == []


def test_candidates_are_tried_in_preferred_order_then_sentence_order(doc, senses):
    senses["baker"] = [BAKER_PERSON, BAKER_OVEN]
    senses["dough"] = [DOUGH_FOOD, DOUGH_MONEY]

    assert words(pun_readings(doc, TIED)) == ["baker", "dough"]
    assert words(pun_readings(doc, TIED, preferred=[DOUGH])) == ["dough", "baker"]


def test_select_senses_explains_the_first_reading(doc, senses):
    senses["baker"] = [BAKER_PERSON, BAKER_OVEN]
    senses["dough"] = [DOUGH_FOOD, DOUGH_MONEY]

    assert select_senses(doc, TIED, preferred=[DOUGH]) == {
        "words_involved": ["dough"],
        "explanation": (
            "“dough” can mean “a flour mixture stiff enough to knead or roll” or "
            "“informal terms for money”; the sentence supports both because both fit "
            "as the object of “need”. This is a proposed reading, not proof."
        ),
        "sense_source": "wordnet",
    }
    assert select_senses(doc, TIED)["explanation"] == (
        "“baker” can mean “someone who bakes bread or cake” or “a portable oven for "
        "baking”; the sentence supports both because both definitions are about "
        "equally close to the sentence's meaning. This is a proposed reading, not proof."
    )


def tied(method, top=DOUGH_FOOD, runner_up=DOUGH_MONEY):
    """A pair scored by `method` with a margin of 0, for testing the explanation alone."""
    return PunSignal(
        top=ScoredSense(top, 1.0, method),
        runner_up=ScoredSense(runner_up, 1.0, method),
        margin=0.0,
        sense_source="wordnet",
    )


@pytest.mark.parametrize(
    ("relation", "predicate", "evidence"),
    [
        ("dobj", "need", "both fit as the object of “need”"),
        ("nsubj", "rise", "both fit as the subject of “rise”"),
        ("prep_in", "hide", "both fit in “hide ... in ___”"),
        ("iobj", "give", "both fit the seeded “give” / “iobj” slot"),
    ],
    ids=["object", "subject", "preposition", "any other slot"],
)
def test_seeded_evidence_names_the_slot_in_plain_words(relation, predicate, evidence):
    context = LocalContext(relation=relation, predicate=predicate)

    assert selection._evidence(context, tied("selectional_preference")) == evidence


def test_lesk_evidence_names_no_slot():
    # Lesk compares each gloss with the whole sentence, so no slot was involved.
    root = LocalContext(relation="ROOT", predicate=None)

    assert selection._evidence(root, tied("embedding_lesk")) == (
        "both definitions are about equally close to the sentence's meaning"
    )


def test_glosses_are_quoted_without_their_trailing_period():
    # A Wiktionary gloss is a sentence: quoted, it keeps its capital but not its
    # period, so the explanation never reads 'currency.”;'.
    pair = tied("embedding_lesk", CHEDDAR_CHEESE, CHEDDAR_MONEY)

    assert selection._explain("cheddar", LocalContext("dobj", "want"), pair) == (
        "“cheddar” can mean “hard smooth-textured cheese; originally made in Cheddar "
        "in southwestern England” or “Money, cash, currency”; the sentence supports "
        "both because both definitions are about equally close to the sentence's "
        "meaning. This is a proposed reading, not proof."
    )


@pytest.mark.parametrize(
    ("gloss", "quoted"),
    [
        ("informal terms for money", "“informal terms for money”"),
        ("Money, cash, currency.", "“Money, cash, currency”"),
        (" Money, cash, currency. ", "“Money, cash, currency”"),
        # These final periods belong to an abbreviation or an ellipsis, not a sentence.
        ("trim the nails, etc.", "“trim the nails, etc.”"),
        ("a state in the U.S.", "“a state in the U.S.”"),
        ("A set of proteins...", "“A set of proteins...”"),
        # A doubled period still ends a sentence: drop one, keep the abbreviation's.
        ("A football club, F.C..", "“A football club, F.C.”"),
        # A gloss's own straight quotes (or inch marks) are left as written.
        ('Usually in the phrase "touch grass".', '“Usually in the phrase "touch grass"”'),
        ('Paper size (10"-12.5")', '“Paper size (10"-12.5")”'),
    ],
    ids=[
        "WordNet",
        "Wiktionary",
        "stray whitespace",
        "etc.",
        "initialism",
        "ellipsis",
        "doubled period",
        "inner quotes",
        "inch marks",
    ],
)
def test_quote(gloss, quoted):
    assert selection._quote(gloss) == quoted


def test_select_senses_is_none_without_a_reading(doc, senses):
    senses["baker"] = [BAKER_PERSON]

    assert select_senses(doc, TIED) is None


def test_a_margin_exactly_at_the_threshold_is_a_reading(doc, senses):
    senses["baker"] = [BAKER_PERSON, BAKER_OVEN]
    embed = embed_with([1.0, 1.0, 0.0], [1.0, -0.5, 0.0])
    [reading] = pun_readings(doc, embed, threshold=math.inf)

    assert words(pun_readings(doc, embed, threshold=reading.signal.margin)) == ["baker"]


def test_a_runner_up_scoring_exactly_zero_is_not_a_reading(doc, senses):
    # Both glosses are orthogonal to the sentence: a tie at "no similarity at all".
    senses["baker"] = [BAKER_PERSON, BAKER_OVEN]
    embed = embed_with([0.0, 1.0, 0.0], [0.0, 0.0, 1.0])

    assert list(pun_readings(doc, embed)) == []


def test_a_preferred_candidate_past_the_cap_is_still_tried(senses):
    # Ten sentences, four candidates each: the last "dough" is candidate 40 of 40.
    doc = get_model()(" ".join([SENTENCE] * 10))
    last_dough = max(token.i for token in doc if token.text == "dough")
    senses["dough"] = [DOUGH_FOOD, DOUGH_MONEY]

    reading = next(pun_readings(doc, TIED, preferred=[last_dough]))

    assert reading.candidate.index == last_dough
