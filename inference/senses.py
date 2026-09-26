import json
import threading
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Literal

import httpx
import wn

from candidates import CandidateWord

_WORDNET_POS = {
    "NOUN": ["n"],
    "VERB": ["v"],
    "ADJ": ["a", "s"],
}

_WIKTIONARY_POS = {
    "NOUN": "Noun",
    "VERB": "Verb",
    "ADJ": "Adjective",
}

_MAX_HYPERNYM_DEPTH = 50

_WIKTIONARY_HEADERS = {
    "User-Agent": "pun-analysis-agent/0.1 (https://github.com/team-play/pun-analysis-agent)",
}


@dataclass(frozen=True)
class Sense:
    """One candidate meaning of a word.

    `lexfile` is WordNet's coarse category (e.g. "noun.food"). It is None for
    Wiktionary senses, meaning "category unknown", NOT "a different category"
    -- TASK-19 must not count a WordNet/Wiktionary pair as crossing categories.
    """

    gloss: str
    hypernyms: tuple[str, ...]
    lexfile: str | None
    source: Literal["wordnet", "wiktionary"]


_wordnet: wn.Wordnet | None = None
_wordnet_lock = threading.Lock()


def _get_wordnet() -> wn.Wordnet:
    global _wordnet
    if _wordnet is None:
        with _wordnet_lock:
            if _wordnet is None:
                # wn's SQLite connection is bound to its creating thread unless
                # this is set; FastAPI runs sync /analyze on threadpool workers.
                # Safe because we only read and sqlite3.threadsafety == 3.
                wn.config.allow_multithreading = True
                _wordnet = wn.Wordnet("oewn:2025")
    return _wordnet


def get_wordnet_senses(candidate: CandidateWord) -> list[Sense]:
    """Tier 0: candidate's WordNet synsets, as glosses + hypernym chains."""
    wordnet = _get_wordnet()
    pos_tags = _WORDNET_POS.get(candidate.pos, [])

    senses = []
    for pos in pos_tags:
        for synset in wordnet.synsets(candidate.lemma, pos=pos):
            senses.append(
                Sense(
                    gloss=synset.definition(),
                    hypernyms=_hypernym_chain(synset),
                    lexfile=synset.lexfile(),
                    source="wordnet",
                )
            )
    return senses


def _hypernym_chain(synset: wn.Synset) -> tuple[str, ...]:
    chain = []
    current = synset
    hypernyms = current.hypernyms()
    while hypernyms and len(chain) < _MAX_HYPERNYM_DEPTH:
        current = hypernyms[0]
        chain.append(current.lemmas()[0])
        hypernyms = current.hypernyms()
    return tuple(chain)


def _fetch_wiktionary_definitions(word: str) -> dict:
    """GET the raw Wiktionary API response for `word`, or {} on any failure.

    Tier 2 is itself a fallback -- if Wiktionary is unreachable, slow, or
    errors, that must degrade to "no extra senses found", never propagate
    an unhandled exception up through /analyze (docs/design/sense-selection.md).
    """
    try:
        response = httpx.get(
            f"https://en.wiktionary.org/api/rest_v1/page/definition/{word}",
            headers=_WIKTIONARY_HEADERS,
            timeout=2.0,
        )
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPStatusError, httpx.RequestError, httpx.InvalidURL, json.JSONDecodeError):
        return {}


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.chunks: list[str] = []

    def handle_data(self, data: str):
        self.chunks.append(data)


def _strip_html(html_text: str) -> str:
    """Wiktionary definitions embed HTML (links, spans, styles) -- return plain text."""
    extractor = _TextExtractor()
    extractor.feed(html_text)
    return "".join(extractor.chunks)


def get_wiktionary_senses(candidate: CandidateWord) -> list[Sense]:
    """Tier 2 fallback: Wiktionary definitions, used when WordNet coverage is thin."""
    response = _fetch_wiktionary_definitions(candidate.lemma)
    senses = []
    for entry in response.get("en", []):
        if entry.get("partOfSpeech") == _WIKTIONARY_POS.get(candidate.pos):
            for definition in entry.get("definitions", []):
                gloss = _strip_html(definition.get("definition", ""))
                if gloss:
                    senses.append(
                        Sense(gloss=gloss, hypernyms=(), lexfile=None, source="wiktionary")
                    )
    return senses


def get_candidate_senses(candidate: CandidateWord) -> list[Sense]:
    """Orchestrator: WordNet first; fall back to Wiktionary if coverage is thin (<2 senses)."""
    senses = get_wordnet_senses(candidate)
    if len(senses) < 2:
        senses.extend(get_wiktionary_senses(candidate))
    return senses
