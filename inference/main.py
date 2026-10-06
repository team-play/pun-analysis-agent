import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from pun_detector.agent import PunAnalysis, load_analysis
from pun_detector.features import MAX_CHARS

# Python drops log records below WARNING unless configured, so sense
# selection's INFO lines saying why a pun fell back would never reach Cloud Run.
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[dict[str, PunAnalysis]]:
    # uvicorn binds its port only after startup, so the service never answers before the
    # detector is loaded and warm, and a load failure stops startup. Blocking the event loop
    # here is fine: nothing else runs until startup is done.
    yield {"analysis": load_analysis()}


app = FastAPI(title="pun-analysis-agent inference", lifespan=lifespan)


def get_analysis(request: Request) -> PunAnalysis:
    return request.state.analysis


AnalysisDep = Annotated[PunAnalysis, Depends(get_analysis)]


@app.exception_handler(RequestValidationError)
async def validation_error_without_input(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    # FastAPI's default 422 body, minus each error's `input`: the caller already has its own
    # text, and echoing it back fails on text UTF-8 can't encode (a lone surrogate), turning
    # the 422 into a 500.
    errors = [{k: v for k, v in error.items() if k != "input"} for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(errors)})


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_CHARS)

    @field_validator("text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Sentence must not be blank")
        return value


class ClassProbabilities(BaseModel):
    non_pun: float = Field(ge=0, le=1)
    homographic: float = Field(ge=0, le=1)
    homophonic: float = Field(ge=0, le=1)


class AnalyzeResponse(BaseModel):
    is_pun: bool | None
    pun_type: Literal["homographic", "homophonic"] | None
    words_involved: list[str]
    explanation: str
    confidence: float | None = Field(ge=0, le=1)
    probabilities: ClassProbabilities | None = None
    sense_source: Literal["wordnet", "wiktionary", "llm_fallback"] | None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest, analysis: AnalysisDep) -> AnalyzeResponse:
    return AnalyzeResponse.model_validate(analysis.analyze(body.text))
