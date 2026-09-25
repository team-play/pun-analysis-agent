import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

// config.ts reads process.env once, at import. Each import below gets a
// fresh copy of the module via a unique query string, so it sees the
// APP_CHECK and K_SERVICE values set just before it.
let importCount = 0;
const setEnv = (name: string, value: string | undefined) => {
	if (value === undefined) delete process.env[name];
	else process.env[name] = value;
};
const loadConfigWith = async (
	appCheck: string | undefined,
	{ kService }: { kService?: string } = {},
) => {
	setEnv("APP_CHECK", appCheck);
	setEnv("K_SERVICE", kService);
	const module = await import(`../src/config.ts?${importCount++}`);
	return module.config;
};

afterEach(() => {
	delete process.env.APP_CHECK;
	delete process.env.K_SERVICE;
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

// Cloud Run sets K_SERVICE in every container, and nothing sets it locally.
test("refuses to start on Cloud Run with APP_CHECK=off", async () => {
	await assert.rejects(
		loadConfigWith("off", { kService: "pun-agent-backend" }),
		/APP_CHECK=off.*Cloud Run/,
	);
});

test("starts on Cloud Run with App Check enforced", async () => {
	const config = await loadConfigWith(undefined, {
		kService: "pun-agent-backend",
	});
	assert.equal(config.appCheckEnforced, true);
});
