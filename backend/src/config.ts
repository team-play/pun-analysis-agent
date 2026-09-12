export const config = {
	port: Number(process.env.PORT ?? 8080),
	inferenceUrl: process.env.INFERENCE_URL ?? "http://localhost:8000",
};
