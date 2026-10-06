# Build context is inference/:  docker build inference
# What gets sent is trimmed by inference/.dockerignore.

FROM python:3.12-slim AS wiktionary

ADD --checksum=sha256:62fedfc71c8afba3e4edd072ad07efbb314244deab41707cc15904df8cbd7338 \
    https://github.com/team-play/pun-analysis-agent/releases/download/wiktionary-data-2026-09-25/wiktionary.sqlite.gz /tmp/
RUN python -c "import gzip, shutil; shutil.copyfileobj(gzip.open('/tmp/wiktionary.sqlite.gz'), open('/wiktionary.sqlite', 'wb'))"

# uv only exists in this stage (uv's Docker guide). The runtime image starts
# uvicorn straight from the venv: `uv run` would re-check the lockfile on
# every container start, which fetches en-core-web-sm's metadata from GitHub
# and so makes each Cloud Run cold start depend on GitHub.
FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.11.26 /uv /bin/
# Precompiled bytecode makes the first import on a cold start faster.
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev
ENV WN_DATA_DIR=/wn_data
RUN .venv/bin/python -m wn download oewn:2025 && rm -rf /wn_data/downloads
# The embedding model too: it would otherwise be fetched from HuggingFace into
# /tmp (in-memory on Cloud Run) on every cold start. The export, revision and
# files must match scoring.EMBEDDING_SOURCE, EMBEDDING_REVISION and
# EMBEDDING_FILES; the offline check below fails the build if not, and so does
# tests/test_scoring.py. Written out here rather than read from scoring.py so
# this layer's cache survives edits to scoring.py.
ENV FASTEMBED_CACHE_PATH=/fastembed_cache
RUN .venv/bin/hf download qdrant/all-MiniLM-L6-v2-onnx \
        --revision d13954661f83248295ba75c1ed411eef3b7b936e \
        --include "*.json" --include model.onnx --cache-dir /fastembed_cache --quiet \
    && chmod -R a+rX /fastembed_cache

# Same base as the build stage, which the venv's python symlink points into.
FROM python:3.12-slim
RUN useradd --system --no-create-home app
WORKDIR /app
# HF_HUB_OFFLINE: load the baked-in model only, never download at runtime. Its
# cache lookup would otherwise print a progress bar to every cold start's logs.
ENV PATH=/app/.venv/bin:$PATH WN_DATA_DIR=/wn_data \
    FASTEMBED_CACHE_PATH=/fastembed_cache HF_HUB_OFFLINE=1 HF_HUB_DISABLE_PROGRESS_BARS=1
COPY --from=build /app/.venv .venv
COPY --from=build /wn_data /wn_data
COPY --from=build /fastembed_cache /fastembed_cache
COPY --from=wiktionary /wiktionary.sqlite data/wiktionary.sqlite
COPY . .
USER app
# Fail the build (on every PR, not just at deploy) if the app can't read its
# data as this user: neither lookup is exercised by the deploy's smoke test,
# and a Wiktionary failure only logs and returns [] at runtime.
RUN python -c "\
from candidates import CandidateWord; \
from senses import get_wiktionary_senses, get_wordnet_senses; \
word = CandidateWord(text='interest', lemma='interest', pos='NOUN', index=0); \
assert get_wordnet_senses(word), 'no WordNet senses: check WN_DATA_DIR'; \
assert get_wiktionary_senses(word), 'no Wiktionary senses: check data/wiktionary.sqlite'; \
from scoring import default_embed; \
assert len(default_embed(['interest'])[0]) == 384, 'embedding model: check FASTEMBED_CACHE_PATH'"
# And the pun detector end to end, loaded as service startup loads it, on the same
# baked-in data and embedding model. The model's revision is pinned, so a
# confidence far from the one docs/experiments/task-55 and task-68 recorded means
# the detector's inputs drifted some other way (spaCy, WordNet, fastembed itself).
RUN python -c "from pun_detector.agent import load_analysis; \
result = load_analysis().analyze('The baker needed more dough.'); \
assert result['is_pun'] is True and result['probabilities'], result; \
assert result['sense_source'] == 'wordnet' and result['words_involved'] == ['dough'], result; \
assert abs(result['confidence'] - 0.94911) < 1e-4, f'embedding model drifted: {result}'"
# Cloud Run sets PORT (8080 unless the service overrides it); exec hands
# uvicorn the shell's PID so it gets Cloud Run's SIGTERM directly.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port \"${PORT:-8080}\""]
