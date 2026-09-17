# API Contracts

The only two hard cross-domain dependencies in this project. Any change here must be agreed by both sides of the contract before landing.

## `/analyze` (Inference → Backend, Data/Eval)

```
POST /analyze
{ "text": string }
→ {
    "is_pun": bool,
    "pun_type": "homographic" | "homophonic" | null,
    "words_involved": [string],
    "explanation": string,
    "confidence": float,
    "sense_source": "wordnet" | "wiktionary" | "llm_fallback" | null
  }
```

`sense_source` reports which tier of the sense-selection fallback chain produced `explanation` — `null` when `is_pun` is `false` (no sense selection needed) or when every tier failed (the graceful-failure case). See [`design/sense-selection.md`](design/sense-selection.md) for the full tiered design this field tracks.

## `/api/chat` (Backend → Frontend)

```
POST /api/chat
{ "messages": [{ "role": string, "content": string }] }
→ streamed response (Genkit flow stream format)
```
