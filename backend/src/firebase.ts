import { initializeApp } from "firebase-admin/app";
import { type AppCheck, getAppCheck } from "firebase-admin/app-check";
import { config } from "./config.ts";

let appCheck: AppCheck | undefined;

/**
 * The real App Check verifier: checks the token's signature against Google's
 * public keys (fetched once, then cached), its issuer, and that it was
 * issued for our Firebase project. Initialized on first use, so importing
 * the app (as tests do) or running with App Check off never sets up Firebase.
 */
export const verifyAppCheckToken = (token: string) => {
	// An explicit projectId means firebase-admin never has to look it up from
	// credentials; verifying needs only the public keys, not a service account.
	appCheck ??= getAppCheck(
		initializeApp({ projectId: config.firebaseProjectId }),
	);
	return appCheck.verifyToken(token);
};
