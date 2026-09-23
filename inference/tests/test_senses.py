from candidates import CandidateWord
from senses import _get_wordnet, get_candidate_senses, get_wiktionary_senses, get_wordnet_senses


def test_wordnet_returns_multiple_senses_for_dough():
    candidate = CandidateWord(text="dough", lemma="dough", pos="NOUN", index=0)

    senses = get_wordnet_senses(candidate)

    assert len(senses) > 1
    assert all(s.source == "wordnet" for s in senses)

    glosses = {s.gloss for s in senses}
    assert "a flour mixture stiff enough to knead or roll" in glosses
    assert "informal terms for money" in glosses

    food_sense = next(s for s in senses if s.gloss == "a flour mixture stiff enough to knead or roll")
    money_sense = next(s for s in senses if s.gloss == "informal terms for money")
    assert food_sense.hypernyms[:3] == ["concoction", "foodstuff", "food"]
    assert money_sense.hypernyms[:2] == ["money", "medium of exchange"]
    assert food_sense.hypernyms[-1] == "entity"
    assert money_sense.hypernyms[-1] == "entity"


def test_wiktionary_fallback_for_coverage_gap(monkeypatch):
    candidate = CandidateWord(text="rizz", lemma="rizz", pos="NOUN", index=0)

    assert len(get_wordnet_senses(candidate)) == 0

    def fake_fetch(word):
        return {
            "en": [
                {
                    "partOfSpeech": "Noun",
                    "language": "English",
                    "definitions": [
                        {"definition": "A person's ability to attract a love interest."}
                    ],
                }
            ]
        }

    monkeypatch.setattr("senses._fetch_wiktionary_definitions", fake_fetch)

    senses = get_wiktionary_senses(candidate)
    assert len(senses) > 0
    assert all(s.source == "wiktionary" for s in senses)
    assert all(s.hypernyms == [] for s in senses)
    assert senses[0].gloss == "A person's ability to attract a love interest."


def test_get_candidate_senses_falls_back_only_when_wordnet_coverage_is_thin(monkeypatch):
    dough = CandidateWord(text="dough", lemma="dough", pos="NOUN", index=0)
    dough_senses = get_candidate_senses(dough)
    assert len(dough_senses) > 1
    assert all(s.source == "wordnet" for s in dough_senses)

    rizz = CandidateWord(text="rizz", lemma="rizz", pos="NOUN", index=0)

    def fake_fetch(word):
        return {
            "en": [
                {
                    "partOfSpeech": "Noun",
                    "language": "English",
                    "definitions": [
                        {"definition": "A person's ability to attract a love interest."}
                    ],
                }
            ]
        }

    monkeypatch.setattr("senses._fetch_wiktionary_definitions", fake_fetch)

    rizz_senses = get_candidate_senses(rizz)
    assert len(rizz_senses) > 0
    assert all(s.source == "wiktionary" for s in rizz_senses)


def test_wiktionary_senses_looks_up_lemma_not_surface_text(monkeypatch):
    # text != lemma on purpose -- Wiktionary should be queried with the base
    # form ("dance"), not the inflected surface form ("dancing"), matching
    # what get_wordnet_senses already does.
    dancing = CandidateWord(text="dancing", lemma="dance", pos="VERB", index=0)

    queried_words = []

    def fake_fetch(word):
        queried_words.append(word)
        return {"en": []}

    monkeypatch.setattr("senses._fetch_wiktionary_definitions", fake_fetch)

    get_wiktionary_senses(dancing)

    assert queried_words == ["dance"]


def test_wordnet_covers_verb_pos():
    running = CandidateWord(text="running", lemma="run", pos="VERB", index=0)

    senses = get_wordnet_senses(running)

    assert len(senses) > 1
    assert all(s.source == "wordnet" for s in senses)


def test_wordnet_covers_both_adjective_pos_tags():
    # "light" has senses under WordNet's plain ("a") AND satellite ("s")
    # adjective tags -- this pins down that _WORDNET_POS["ADJ"] queries both,
    # not just one.
    light = CandidateWord(text="light", lemma="light", pos="ADJ", index=0)
    wordnet = _get_wordnet()

    plain_only = len(wordnet.synsets("light", pos="a"))
    satellite_only = len(wordnet.synsets("light", pos="s"))

    senses = get_wordnet_senses(light)

    assert len(senses) == plain_only + satellite_only
    assert len(senses) > max(plain_only, satellite_only)

