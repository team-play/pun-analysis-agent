import sqlite3
import threading

import httpx
import pytest

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

    food_sense = next(
        s for s in senses if s.gloss == "a flour mixture stiff enough to knead or roll"
    )
    money_sense = next(s for s in senses if s.gloss == "informal terms for money")
    assert food_sense.hypernyms[:3] == ("concoction", "foodstuff", "food")
    assert money_sense.hypernyms[:2] == ("money", "medium of exchange")
    assert food_sense.hypernyms[-1] == "entity"
    assert money_sense.hypernyms[-1] == "entity"
    assert food_sense.lexfile == "noun.food"
    assert money_sense.lexfile == "noun.possession"


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
    assert all(s.hypernyms == () for s in senses)
    assert all(s.lexfile is None for s in senses)
    assert senses[0].gloss == "A person's ability to attract a love interest."


def test_get_candidate_senses_falls_back_only_when_wordnet_coverage_is_thin(monkeypatch):
    # "dough" has exactly 2 WordNet senses -- the boundary where no fallback
    # should happen. The spy both proves that and keeps the test offline.
    fetched = []

    def spy(word):
        fetched.append(word)
        return {}

    monkeypatch.setattr("senses._fetch_wiktionary_definitions", spy)

    dough = CandidateWord(text="dough", lemma="dough", pos="NOUN", index=0)
    dough_senses = get_candidate_senses(dough)
    assert len(dough_senses) > 1
    assert all(s.source == "wordnet" for s in dough_senses)
    assert fetched == []

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


def test_get_candidate_senses_merges_wiktionary_when_wordnet_has_one_sense(monkeypatch):
    # "pun" has exactly 1 WordNet noun sense -- the other side of the < 2
    # boundary, so WordNet and Wiktionary senses come back together.
    pun = CandidateWord(text="pun", lemma="pun", pos="NOUN", index=0)
    assert len(get_wordnet_senses(pun)) == 1

    def fake_fetch(word):
        return {
            "en": [
                {
                    "partOfSpeech": "Noun",
                    "definitions": [{"definition": "A joke exploiting multiple meanings."}],
                }
            ]
        }

    monkeypatch.setattr("senses._fetch_wiktionary_definitions", fake_fetch)

    senses = get_candidate_senses(pun)
    assert [s.source for s in senses] == ["wordnet", "wiktionary"]


def test_wordnet_usable_from_another_thread_after_loading():
    # FastAPI runs sync endpoints on threadpool workers, so WordNet loaded on
    # one thread must still work on another (wn.config.allow_multithreading).
    _get_wordnet()
    dough = CandidateWord(text="dough", lemma="dough", pos="NOUN", index=0)
    errors = []

    def worker():
        try:
            get_wordnet_senses(dough)
        except sqlite3.ProgrammingError as e:
            errors.append(e)

    thread = threading.Thread(target=worker)
    thread.start()
    thread.join()

    assert errors == []


def test_sense_is_hashable():
    dough = CandidateWord(text="dough", lemma="dough", pos="NOUN", index=0)
    senses = get_wordnet_senses(dough)
    assert len(set(senses)) == len(senses)


def _raise_timeout(*args, **kwargs):
    raise httpx.TimeoutException("timed out")


def _server_error(*args, **kwargs):
    return httpx.Response(500, request=httpx.Request("GET", "https://example"))


def _non_json(*args, **kwargs):
    return httpx.Response(200, text="<html>", request=httpx.Request("GET", "https://example"))


def _invalid_url(*args, **kwargs):
    raise httpx.InvalidURL("bad url")


@pytest.mark.parametrize("fake_get", [_raise_timeout, _server_error, _non_json, _invalid_url])
def test_wiktionary_failures_degrade_to_no_senses(monkeypatch, fake_get):
    monkeypatch.setattr("senses.httpx.get", fake_get)
    rizz = CandidateWord(text="rizz", lemma="rizz", pos="NOUN", index=0)

    assert get_wiktionary_senses(rizz) == []
