import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

// config.ts reads process.env once, at import. Each import below gets a
// fresh copy of the module via a unique query string, so it sees the
// APP_CHECK value set just before it.
let importCount = 0;
const loadConfigWith = async (appCheck: string | undefined) => {
	if (appCheck === undefined) delete process.env.APP_CHECK;
	else process.env.APP_CHECK = appCheck;
	const module = await import(`../src/config.ts?${importCount++}`);
	return module.config;
};

afterEach(() => {
	delete process.env.APP_CHECK;
});

test("App Check is enforced when APP_CHECK is unset", async () => {
	assert.equal((await loadConfigWith(undefined)).appCheckEnforced, true);
});

test("App Check is off only for the exact value APP_CHECK=off", async () => {
	assert.equal((await loadConfigWith("off")).appCheckEnforced, false);
});

// Fail-closed: a typo or a different spelling keeps protection on.
for (const value of ["", "OFF", "false", "0", "of"]) {
	test(`App Check stays enforced for APP_CHECK=${JSON.stringify(value)}`, async () => {
		assert.equal((await loadConfigWith(value)).appCheckEnforced, true);
	});
}
