import pytest
import wn

from pun_detector import agent
from pun_detector.agent import PunAnalysis, undetermined
from tests.fakes import BrokenDetector, FakeDetector, RecordingSelector, selected


def verdict(result):
    return {k: result[k] for k in ("is_pun", "pun_type", "confidence", "probabilities")}


def test_a_failed_detection_is_the_undetermined_result():
    selector = RecordingSelector()

    result = PunAnalysis(BrokenDetector(), selector).analyze("The baker needed more dough.")

    assert result == undetermined()
    assert selector.calls == []


def test_a_non_pun_keeps_its_verdict_and_skips_sense_selection():
    # is_pun false ("not a pun") must not turn into null ("couldn't judge"): Gemini reads them differently.
    detector = FakeDetector(pun_type=None)
    selector = RecordingSelector()

    result = PunAnalysis(detector, selector).analyze("The meeting starts at nine.")

    assert verdict(result) == verdict(detector.prediction)
    assert result["sense_source"] is None
    assert result["words_involved"] == []
    assert result["explanation"] == ""
    assert selector.calls == []


def test_a_homophonic_pun_is_handed_to_the_llm_without_sense_selection():
    # Same-word senses can't explain a sound-alike pun, so there is no word to suspect yet.
    detector = FakeDetector(pun_type="homophonic")
    selector = RecordingSelector()

    result = PunAnalysis(detector, selector).analyze("Lettuce romaine calm.")

    assert verdict(result) == verdict(detector.prediction)
    assert result["sense_source"] == "llm_fallback"
    assert result["words_involved"] == []
    assert result["explanation"] == ""
    assert selector.calls == []


@pytest.mark.parametrize("sense_source", ["wordnet", "wiktionary"])
def test_a_homographic_pun_takes_the_selected_senses(sense_source):
    detector = FakeDetector()
    selector = RecordingSelector(returns=selected(sense_source))

    result = PunAnalysis(detector, selector).analyze("The baker needed more dough.")

    assert result == {**verdict(detector.prediction), **selected(sense_source)}
    # Selection gets the detector's ranked candidates and its extractor, not fresh ones.
    [(_, ranked, extractor)] = selector.calls
    assert ranked == detector.prediction["candidate_pairs"]
    assert extractor is detector.extractor


def test_sense_selection_never_changes_the_verdict():
    # Even a selector that returns verdict fields can't overwrite detection's (docs/contracts.md).
    detector = FakeDetector()
    selector = RecordingSelector(
        returns={
            **selected("wordnet"),
            "is_pun": False,
            "pun_type": "homophonic",
            "confidence": 0.0,
            "probabilities": None,
        }
    )

    result = PunAnalysis(detector, selector).analyze("The baker needed more dough.")

    assert verdict(result) == verdict(detector.prediction)


@pytest.mark.parametrize(
    ("returns", "raises"),
    [(None, None), (None, LookupError("no senses"))],
    ids=["finds no sense pair", "raises"],
)
def test_a_homographic_pun_falls_back_to_the_llm_when_selection_finds_nothing_or_fails(
    returns, raises
):
    detector = FakeDetector()
    selector = RecordingSelector(returns=returns, raises=raises)

    result = PunAnalysis(detector, selector).analyze("The baker needed more dough.")

    assert len(selector.calls) == 1
    assert verdict(result) == verdict(detector.prediction)
    assert result["sense_source"] == "llm_fallback"
    assert result["explanation"] == ""
    # The detector's top-ranked candidate is still passed on as the suspected word.
    assert result["words_involved"] == ["dough"]


def test_a_homographic_pun_without_candidates_falls_back_with_no_suspected_word():
    # docs/contracts.md: words_involved lists suspected words only "when Inference found any".
    detector = FakeDetector(candidates=())

    result = PunAnalysis(detector, RecordingSelector()).analyze("The baker needed more dough.")

    assert result["sense_source"] == "llm_fallback"
    assert result["words_involved"] == []


def test_by_default_selection_runs_on_the_detectors_parse_embed_and_ranking(monkeypatch):
    calls = []

    def fake_select_senses(doc, embed, *, preferred):
        calls.append((doc, embed, preferred))
        return selected("wordnet")

    monkeypatch.setattr(agent, "select_senses", fake_select_senses)

    class Extractor:
        embed = object()

        @staticmethod
        def nlp(text):
            return f"parsed: {text}"

    detector = FakeDetector(candidates=("dough", "baker"))
    detector.extractor = Extractor

    result = PunAnalysis(detector).analyze("The baker needed more dough.")

    assert result["sense_source"] == "wordnet"
    # The detector's ranking reaches selection as token indexes, best first.
    assert calls == [("parsed: The baker needed more dough.", Extractor.embed, [0, 1])]


def fake_loading(monkeypatch, detector, selector=None):
    """Make load_analysis build `detector` and `selector`, recording the extractor it is given."""
    built_with = []
    monkeypatch.setattr(agent, "FeatureExtractor", lambda: "extractor")
    monkeypatch.setattr(
        agent, "PunDetector", lambda extractor: built_with.append(extractor) or detector
    )
    monkeypatch.setattr(
        agent, "select_with_detector", selector or RecordingSelector(selected("wordnet"))
    )
    # Restored after the test, since load_analysis sets it process-wide.
    monkeypatch.setattr(wn.config, "allow_multithreading", False)
    return built_with


def test_loading_warms_the_analysis_up_on_a_real_prediction(monkeypatch):
    detector = FakeDetector()
    predicted = []
    detector.predict = lambda text: predicted.append(text) or detector.prediction
    built_with = fake_loading(monkeypatch, detector)

    analysis = agent.load_analysis()

    assert analysis.detector is detector
    assert built_with == ["extractor"]
    assert predicted == [agent.WARM_UP_TEXT]
    assert analysis.selector.calls != []
    # Requests run on worker threads, not the startup thread that opened wn's connection.
    assert wn.config.allow_multithreading is True


LOAD_FAILURES = {
    "detection fails": (BrokenDetector(), None),
    "detector misses the pun": (FakeDetector(pun_type=None), None),
    "selection fails": (FakeDetector(), RecordingSelector(raises=LookupError("no senses"))),
    "selection finds nothing": (FakeDetector(), RecordingSelector(returns=None)),
}


@pytest.mark.parametrize(("detector", "selector"), LOAD_FAILURES.values(), ids=LOAD_FAILURES.keys())
def test_loading_raises_when_wordnet_does_not_explain_the_warm_up(monkeypatch, detector, selector):
    # analyze() degrades these to the undetermined or llm_fallback result; startup must not,
    # since every request would degrade the same way.
    fake_loading(monkeypatch, detector, selector)

    with pytest.raises(RuntimeError, match="Warm-up"):
        agent.load_analysis()
