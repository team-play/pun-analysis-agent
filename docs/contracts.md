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
    "confidence": float
  }
```

## `/api/chat` (Backend → Frontend)

```
POST /api/chat
{ "messages": [{ "role": string, "content": string }] }
→ streamed response (Genkit flow stream format)
```
