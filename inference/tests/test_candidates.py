from candidates import extract_candidates


def test_extracts_open_class_candidates():
    candidates = extract_candidates("The baker needed more dough.")
    words = [c.text for c in candidates]

    assert words == ["baker", "needed", "more", "dough"]
    assert {c.pos for c in candidates} <= {"NOUN", "VERB", "ADJ"}


def test_excludes_closed_class_tokens():
    candidates = extract_candidates("The baker needed dough for her shop.")
    words = [c.text for c in candidates]

    assert words == ["baker", "needed", "dough", "shop"]
    assert "The" not in words
    assert "for" not in words
    assert "her" not in words
    assert "." not in words
