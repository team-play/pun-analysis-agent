import { googleAI } from "@genkit-ai/google-genai";
import { genkit } from "genkit";

export const ai = genkit({ plugins: [googleAI()] });

export const chatModel = googleAI.model("gemini-flash-latest");
