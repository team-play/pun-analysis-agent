import pytest
from fastapi.testclient import TestClient

import main
from pun_detector.agent import PunAnalysis, undetermined
from tests.fakes import BrokenDetector, FakeDetector, RecordingSelector, selected

# Each builds a fresh PunAnalysis, so no fake's state outlives its test.
ANALYSES = {
    "undetermined": lambda: PunAnalysis(BrokenDetector()),
    "not a pun": lambda: PunAnalysis(FakeDetector(pun_type=None)),
    "llm_fallback": lambda: PunAnalysis(FakeDetector(pun_type="homophonic")),
    "wordnet": lambda: PunAnalysis(FakeDetector(), RecordingSelector(selected("wordnet"))),
    "wiktionary": lambda: PunAnalysis(FakeDetector(), RecordingSelector(selected("wiktionary"))),
}


class FixedAnalysis:
    def __init__(self, result):
        self.result = result
        self.calls = []

    def analyze(self, text):
        self.calls.append(text)
        return self.result


def serve(monkeypatch, analysis):
    """A client whose startup loads `analysis` instead of the real detector."""
    monkeypatch.setattr(main, "load_analysis", lambda: analysis)
    # A server error comes back as a 500 response instead of raising in the test.
    return TestClient(main.app, raise_server_exceptions=False)


@pytest.mark.parametrize("build", ANALYSES.values(), ids=ANALYSES.keys())
def test_analyze_returns_every_result_shape_unchanged(monkeypatch, build):
    # AnalyzeResponse must neither 500 on a contract-valid result (e.g. the undetermined
    # result's nulls, or a sense_source it doesn't list) nor drop or alter a field.
    expected = build().analyze("The baker needed more dough.")

    with serve(monkeypatch, build()) as client:
        response = client.post("/analyze", json={"text": "The baker needed more dough."})

    assert response.status_code == 200
    assert response.json() == expected


@pytest.mark.parametrize(
    "breakage",
    [{"confidence": 1.5}, {"pun_type": "spoonerism"}, {"sense_source": "gemini"}],
    ids=["confidence above 1", "unknown pun_type", "unknown sense_source"],
)
def test_analyze_answers_500_when_a_result_breaks_the_contract(monkeypatch, breakage):
    # A contract-breaking result must not reach Backend looking like a valid one.
    with serve(monkeypatch, FixedAnalysis({**undetermined(), **breakage})) as client:
        response = client.post("/analyze", json={"text": "The baker needed more dough."})

    assert response.status_code == 500


# The limit is written out rather than read from MAX_CHARS, and Backend's
# tests/tools/analyze-pun.test.ts pins the same 2,000, so changing it on one side alone
# fails a test (docs/contracts.md).
@pytest.mark.parametrize("text", ["x" * 2000, "😀" * 2000], ids=["2,000 characters", "2,000 emoji"])
def test_analyze_accepts_text_up_to_2000_characters(monkeypatch, text):
    analysis = FixedAnalysis(undetermined())

    with serve(monkeypatch, analysis) as client:
        response = client.post("/analyze", json={"text": text})

    assert response.status_code == 200
    assert analysis.calls == [text]


@pytest.mark.parametrize(
    "text", ["", "   ", "x" * 2001], ids=["empty", "blank", "2,001 characters"]
)
def test_analyze_rejects_empty_blank_and_overlong_text(monkeypatch, text):
    with serve(monkeypatch, FixedAnalysis(undetermined())) as client:
        response = client.post("/analyze", json={"text": text})

    assert response.status_code == 422


def test_health_answers_without_running_a_prediction(monkeypatch):
    analysis = FixedAnalysis(undetermined())

    with serve(monkeypatch, analysis) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert analysis.calls == []


def test_a_failed_load_stops_startup(monkeypatch):
    def load_analysis():
        raise RuntimeError("model failed to load")

    monkeypatch.setattr(main, "load_analysis", load_analysis)

    # Entering the client runs startup, as uvicorn does before it accepts connections.
    with pytest.raises(RuntimeError, match="model failed to load"), TestClient(main.app):
        pass
