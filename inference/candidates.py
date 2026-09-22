from dataclasses import dataclass
from functools import lru_cache

import spacy
from spacy.language import Language

_CANDIDATE_POS = {"NOUN", "VERB", "ADJ"}
@dataclass(frozen=True)
class CandidateWord:
    text: str
    lemma: str
    pos: str
    index: int


@lru_cache(maxsize=1)
def _get_model() -> Language:
    return spacy.load("en_core_web_sm", disable=["ner"])


def extract_candidates(text: str) -> list[CandidateWord]:
    doc = _get_model()(text)
    return [
        CandidateWord(text=token.text, lemma=token.lemma_, pos=token.pos_, index=token.i)
        for token in doc
        if token.pos_ in _CANDIDATE_POS
    ]
