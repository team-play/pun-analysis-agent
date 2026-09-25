const DEFAULT_ALLOWED_ORIGINS = [
	// Frontend local dev server (docs/local-setup.md).
	"http://localhost:5173",
	// Deployed Firebase Hosting frontend (docs/local-setup.md), which Firebase
	// serves on both of these domains.
	"https://pun-agent.web.app",
	"https://pun-agent.firebaseapp.com",
];

const parsedAllowedOrigins = process.env.CORS_ORIGIN?.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

export const config = {
	port: Number(process.env.PORT ?? 8080),
	inferenceUrl: process.env.INFERENCE_URL ?? "http://localhost:8000",
	allowedOrigins:
		parsedAllowedOrigins && parsedAllowedOrigins.length > 0
			? parsedAllowedOrigins
			: DEFAULT_ALLOWED_ORIGINS,
	// The Firebase project App Check tokens must be issued for: the one
	// Frontend's App Check runs in (FIREBASE_CONFIG in
	// frontend/src/lib/firebase/app-check.ts, and frontend/.firebaserc).
	// Change them together. It isn't tied to where Cloud Run deploys.
	firebaseProjectId: "pun-agent",
	// Fail-closed: only the exact value "off" (for local dev without a
	// registered debug token, see docs/local-setup.md) turns App Check off.
	appCheckEnforced: process.env.APP_CHECK !== "off",
};
