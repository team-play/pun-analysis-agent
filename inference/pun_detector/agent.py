"""Compose classifier output with the team's sense-selection pipeline (selection.py)."""

import logging
import threading

from selection import select_senses

from .features import FeatureExtractor, validate_text
from .model import PunDetector

logger = logging.getLogger(__name__)


def undetermined():
    return {
        "is_pun": None,
        "pun_type": None,
        "confidence": None,
        "probabilities": None,
        "words_involved": [],
        "explanation": "",
        "sense_source": None,
    }


class PunAnalysis:
    """Serialize requests because the detector keeps mutable embedding caches."""

    def __init__(self, detector, selector=None):
        self.detector = detector
        self.selector = selector or select_with_detector
        self.lock = threading.Lock()

    def analyze(self, text):
        validate_text(text)
        with self.lock:
            try:
                prediction = self.detector.predict(text)
            except Exception:
                logger.exception("Pun detection failed")
                return undetermined()
            result = {k: prediction[k] for k in ("is_pun", "pun_type", "confidence")}
            result["probabilities"] = prediction.get("probabilities")
            result.update(words_involved=[], explanation="", sense_source=None)
            if not result["is_pun"]:
                return result
            result["sense_source"] = "llm_fallback"
            # Same-word meanings do not explain a sound-alike pun.
            if result["pun_type"] != "homographic":
                return result
            ranked = prediction.get("candidate_pairs", [])
            result["words_involved"] = [p["candidate"]["text"] for p in ranked[:1]]
            try:
                selected = self.selector(text, ranked, self.detector.extractor)
                if selected is not None:
                    result.update(
                        {k: selected[k] for k in ("words_involved", "explanation", "sense_source")}
                    )
            except Exception:
                logger.exception("Local sense selection failed; handing off to backend")
            return result


# A homographic pun WordNet explains (the Dockerfile checks the same result), so
# warming up also runs, and checks, sense selection.
WARM_UP_TEXT = "The baker needed more dough."


def load_analysis():
    """Build the service's analysis and run it once, so no request pays for loading.

    The first prediction is what loads the embedding model and fills the detector's
    caches. A broken detector or sense selection raises instead of degrading to the
    undetermined or llm_fallback result, which it would then do for every request,
    so a broken deploy stops at startup.
    """
    import wn

    # wn connections must also work when a later request uses a new worker.
    wn.config.allow_multithreading = True
    analysis = PunAnalysis(PunDetector(extractor=FeatureExtractor()))
    result = analysis.analyze(WARM_UP_TEXT)
    if result["sense_source"] != "wordnet":
        raise RuntimeError(f"Warm-up analysis failed (see any logged error): {result}")
    return analysis


def select_with_detector(text, ranked_pairs, extractor):
    """Run sense selection on the detector's parse, trying its ranked candidates first."""
    preferred = [pair["candidate"]["index"] for pair in ranked_pairs]
    return select_senses(extractor.nlp(text), extractor.embed, preferred=preferred)
