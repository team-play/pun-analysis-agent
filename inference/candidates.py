import threading
from dataclasses import dataclass

import spacy
from spacy.language import Language

_CANDIDATE_POS = {"NOUN", "VERB", "ADJ"}


@dataclass(frozen=True)
class CandidateWord:
    text: str
    lemma: str
    pos: str
    index: int


_model: Language | None = None
_model_lock = threading.Lock()


def _get_model() -> Language:
    # Double-checked locking, not @lru_cache(maxsize=1) -- lru_cache only
    # locks around its own cache dict, not the wrapped call itself, so two
    # concurrent cache-miss requests on a Cloud Run cold start could both
    # call spacy.load() at once, doubling peak memory/CPU during exactly
    # the window this matters most (see PR #20 review discussion).
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                # parser is disabled -- extract_candidates doesn't read
                # dependency-parse output. TASK-18 (dependency-parse local
                # context) will need it back; re-enable it there rather
                # than re-litigating this tradeoff from scratch.
                _model = spacy.load("en_core_web_sm", disable=["ner", "parser"])
    return _model


def extract_candidates(text: str) -> list[CandidateWord]:
    doc = _get_model()(text)
    return [
        CandidateWord(text=token.text, lemma=token.lemma_, pos=token.pos_, index=token.i)
        for token in doc
        if token.pos_ in _CANDIDATE_POS
    ]
