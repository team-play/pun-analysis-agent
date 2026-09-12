from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="pun-analysis-agent inference")


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    is_pun: bool
    pun_type: Literal["homographic", "homophonic"] | None
    words_involved: list[str]
    explanation: str
    confidence: float


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    # Classifier + WSD logic goes here — see models/.
    raise NotImplementedError("pun classifier not implemented yet")
