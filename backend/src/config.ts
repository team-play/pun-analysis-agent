const DEFAULT_ALLOWED_ORIGINS = [
	// Frontend local dev server (docs/local-setup.md).
	"http://localhost:5173",
	// Deployed Firebase Hosting frontend (docs/local-setup.md).
	"https://pun-agent.web.app",
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
};
