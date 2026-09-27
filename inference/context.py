from dataclasses import dataclass

from spacy.tokens import Doc, Token

from candidates import CandidateWord

# Dependents that carry a copula-like verb's meaning ("was ready", "looked runny").
_COPULA_COMPLEMENTS = {"acomp", "attr"}


@dataclass(frozen=True)
class LocalContext:
    relation: str
    predicate: str | None


def local_contexts(doc: Doc, candidates: list[CandidateWord]) -> list[LocalContext]:
    """(relation, predicate) for each candidate; candidates must come from this same Doc."""
    return [_local_context(doc[candidate.index]) for candidate in candidates]


def _local_context(token: Token) -> LocalContext:
    # Conjuncts first, so the rules below see the list's first item: in
    # "flour, eggs, and dough", dough attaches to eggs, and eggs to flour.
    while token.dep_ == "conj":
        token = token.head

    if token.dep_ == "ROOT":
        # spaCy makes a ROOT token its own head; there's no governing predicate.
        return LocalContext(relation="ROOT", predicate=None)

    if token.dep_ == "pobj":
        # Skip the preposition, keeping it in the relation so "hide in X" and
        # "hide from X" stay separate slots.
        preposition = token.head
        return LocalContext(
            relation=f"prep_{preposition.lemma_}", predicate=preposition.head.lemma_
        )

    if token.dep_ == "nsubj":
        # "be"/"look"/"seem" accept any subject, so the complement decides the sense.
        complement = next(
            (child for child in token.head.children if child.dep_ in _COPULA_COMPLEMENTS), None
        )
        if complement is not None:
            return LocalContext(relation="nsubj", predicate=complement.lemma_)

    return LocalContext(relation=token.dep_, predicate=token.head.lemma_)
