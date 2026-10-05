import { GoogleAuth, type IdTokenClient } from "google-auth-library";

/**
 * Backend couldn't get the ID token Inference's Cloud Run service requires.
 * analyze_pun logs it as its own cause, so the logs point at auth (e.g. the
 * runtime service account or the metadata server) rather than networking.
 */
export class InferenceAuthError extends Error {
	name = "InferenceAuthError";
}

/**
 * Authorization headers carrying an ID token for `audience`, from Cloud
 * Run's metadata server. The client is made on first use and kept, since it
 * caches the token and only fetches a new one as it nears expiry. A failed
 * attempt to make it isn't kept, so the next call tries again.
 */
const idTokenHeaders = (audience: string) => {
	let client: Promise<IdTokenClient> | undefined;
	return async () => {
		client ??= new GoogleAuth()
			.getIdTokenClient(audience)
			.catch((err: unknown) => {
				client = undefined;
				throw err;
			});
		return (await client).getRequestHeaders();
	};
};

/** `promise`, or a rejection with the signal's reason if it aborts first. */
const unlessAborted = <T>(promise: Promise<T>, signal?: AbortSignal | null) =>
	signal
		? Promise.race([
				promise,
				new Promise<never>((_resolve, reject) => {
					signal.throwIfAborted();
					signal.addEventListener("abort", () => reject(signal.reason), {
						once: true,
					});
				}),
			])
		: promise;

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/** Whether `url` is an origin Backend may send analyze_pun's text to. */
const isServiceOrigin = (url: URL, onCloudRun: boolean) =>
	!url.username &&
	!url.password &&
	!url.search &&
	!url.hash &&
	url.pathname === "/" &&
	(onCloudRun
		? url.protocol === "https:"
		: url.protocol === "http:" && LOOPBACK_HOSTS.includes(url.hostname));

export interface InferenceFetchOptions {
	/** config.onCloudRun: whether to attach an ID token. */
	onCloudRun: boolean;
	/**
	 * Headers authorizing a call to Inference. Defaults to an ID token for
	 * Backend's runtime service account; tests pass a fake instead.
	 */
	getAuthHeaders?: () => Promise<Headers>;
}

/**
 * The fetch analyze_pun calls Inference with. It only calls Inference's
 * origin, never follows redirects (which could carry the token elsewhere),
 * and on Cloud Run attaches the ID token Inference's private service
 * requires.
 */
export function createInferenceFetch(
	inferenceUrl: string,
	{ onCloudRun, getAuthHeaders }: InferenceFetchOptions,
): typeof fetch {
	const service = URL.parse(inferenceUrl);
	if (!service || !isServiceOrigin(service, onCloudRun)) {
		throw new Error(
			"INFERENCE_URL must be a service origin: HTTPS on Cloud Run, loopback " +
				`HTTP locally. Got ${JSON.stringify(inferenceUrl)}.`,
		);
	}
	const authHeaders = getAuthHeaders ?? idTokenHeaders(service.origin);

	return async (input, init) => {
		const target = new URL(
			input instanceof Request ? input.url : input.toString(),
		);
		if (target.origin !== service.origin)
			throw new Error("Unexpected Inference origin");

		const headers = new Headers(init?.headers);
		if (onCloudRun) {
			const signal = init?.signal;
			let auth: Headers;
			try {
				// The library's token fetch takes no signal, so this makes
				// analyze_pun's timeout cover it too.
				auth = await unlessAborted(authHeaders(), signal);
			} catch (err) {
				if (signal?.aborted && err === signal.reason) throw err;
				// Genkit's logger records an error's message and stack, not its
				// cause, so the reason goes in the message.
				const reason = err instanceof Error ? err.message : String(err);
				throw new InferenceAuthError(
					`Could not obtain an ID token for Inference: ${reason}`,
					{ cause: err },
				);
			}
			for (const [name, value] of auth) headers.set(name, value);
		}
		return fetch(input, { ...init, headers, redirect: "error" });
	};
}
