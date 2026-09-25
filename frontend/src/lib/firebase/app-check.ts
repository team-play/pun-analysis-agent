// Public by design: Firebase web config and the reCAPTCHA site key ship in
// every Firebase app's bundle. What stops misuse is App Check itself, since
// the key only yields tokens on its allowlisted domains (pun-agent.web.app,
// pun-agent.firebaseapp.com). See docs/local-setup.md. Backend only accepts
// tokens for this project (firebaseProjectId in backend/src/config.ts), so
// change the two together.
const FIREBASE_CONFIG = {
	apiKey: "AIzaSyCFD-13PZQn1zET3mVtNvlVg5II2pM0fzo",
	authDomain: "pun-agent.firebaseapp.com",
	projectId: "pun-agent",
	storageBucket: "pun-agent.firebasestorage.app",
	messagingSenderId: "203365930808",
	appId: "1:203365930808:web:24979186658899b49e93cd",
};
const RECAPTCHA_ENTERPRISE_SITE_KEY =
	"6Lctuc0tAAAAAEyyjec3X9G16UQImL_l-l-hq4WV";

declare global {
	// Read by the App Check SDK to switch to its debug provider.
	var FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean | undefined;
}

/** Starts App Check and resolves to a function returning a current token. */
const initAppCheck = async (): Promise<() => Promise<string>> => {
	// Imported here rather than at the top so only the live adapter loads the
	// SDK: stub builds and tests never fetch it or reCAPTCHA.
	const [
		{ initializeApp },
		{ getToken, initializeAppCheck, ReCaptchaEnterpriseProvider },
	] = await Promise.all([import("firebase/app"), import("firebase/app-check")]);

	// `pnpm dev` can't pass reCAPTCHA (localhost isn't an allowlisted domain),
	// so it uses a debug token registered in the Firebase console instead.
	// `true` makes the SDK generate one and print it to the console for
	// registering. Production builds drop this branch entirely.
	if (import.meta.env.DEV) {
		globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN =
			import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
	}

	const appCheck = initializeAppCheck(initializeApp(FIREBASE_CONFIG), {
		provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
		isTokenAutoRefreshEnabled: true,
	});
	return async () => (await getToken(appCheck)).token;
};

/**
 * Starts App Check right away, so reCAPTCHA is ready before the first
 * message, and returns a function that resolves to a current token. The
 * SDK caches tokens and refreshes them before they expire, so calling it
 * per request is cheap.
 */
export const startAppCheck = (): (() => Promise<string>) => {
	const started = initAppCheck();
	// A failure here surfaces through the token getter below, on the first
	// message; this only keeps it from also being an unhandled rejection.
	started.catch(() => {});

	return async () => (await started)();
};
