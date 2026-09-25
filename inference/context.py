from dataclasses import dataclass

from candidates import CandidateWord, get_model


@dataclass(frozen=True)
class LocalContext:
    relation: str
    predicate: str | None


def local_contexts(text: str, candidates: list[CandidateWord]) -> list[LocalContext]:
    # One parse for the whole sentence, reused for every candidate --
    # candidates all come from this same text (see docs/design/sense-selection.md
    # step 3), so re-parsing per candidate would multiply the dependency
    # parser's cost by len(candidates) for no reason.
    doc = get_model()(text)
    return [_local_context(_token_for(doc, candidate)) for candidate in candidates]


def _token_for(doc, candidate: CandidateWord):
    # candidate.index is only meaningful against a Doc parsed from the same
    # text extract_candidates() saw it in -- a mismatched text/candidate
    # pair could still land in-bounds and silently return the wrong token's
    # relation/predicate, so check the token actually is the candidate word
    # rather than trusting the index alone.
    token = doc[candidate.index]
    if token.text != candidate.text:
        raise ValueError(
            f"candidate {candidate!r} does not match token {token.text!r} at "
            f"index {candidate.index} in the given text -- candidates must come "
            "from extract_candidates(text) for this same text"
        )
    return token


def _local_context(token) -> LocalContext:
    if token.dep_ == "ROOT":
        # spaCy sets a ROOT token's own .head to itself; there's no real
        # governing predicate, so report that honestly instead of the
        # self-referential placeholder.
        return LocalContext(relation="ROOT", predicate=None)
    else:
        return LocalContext(relation=token.dep_, predicate=token.head.lemma_)

