"""Records Inference's real /analyze result for each of check.mjs's texts.

Run from inference/ (the app loads the detector and sense selection there):
    PYTHONPATH=. uv run python ../docs/experiments/task-56/record_results.py
It saves analyze-results.json next to this file, which check.mjs replays to
Gemini instead of calling Inference. See README.md for why each text is here.
"""

import json
from pathlib import Path

from fastapi.testclient import TestClient

from main import app

TEXTS = [
    # A clear homographic pun, with WordNet senses.
    "The past, the present and the future walked into a bar. It was tense.",
    # A clear non-pun.
    "There's no place like home.",
    # An uncertain class split: a pun, but homographic and homophonic about even.
    "The nudist defended himself by citing his Constitutional right to bare arms.",
    # A tentative call: is_pun true, with a confidence just over the threshold.
    "If they ever have a contest for the best looking mannequin, there will be stiff competition.",
]

with TestClient(app) as client:
    results = {text: client.post("/analyze", json={"text": text}).json() for text in TEXTS}

out = Path(__file__).with_name("analyze-results.json")
out.write_text(json.dumps(results, indent="\t", ensure_ascii=False) + "\n")
