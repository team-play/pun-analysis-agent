import { beforeEach, describe, expect, it } from "vitest";
import { createFakeAsyncStorage } from "./fake-async-storage";
import { createBrowserThreadListAdapter } from "./local-storage-thread-list-adapter";

describe("createBrowserThreadListAdapter", () => {
	let storage: ReturnType<typeof createFakeAsyncStorage>;
	let adapter: ReturnType<typeof createBrowserThreadListAdapter>;

	beforeEach(() => {
		storage = createFakeAsyncStorage();
		adapter = createBrowserThreadListAdapter(storage);
	});

	it("starts with an empty thread list", async () => {
		await expect(adapter.list()).resolves.toEqual({ threads: [] });
	});

	it("does not write a thread to the list until initialize() is called", async () => {
		// Merely holding a thread id (e.g. an untouched "New Chat" composer)
		// must never itself create a stored entry.
		await expect(adapter.list()).resolves.toEqual({ threads: [] });
		expect(await storage.getItem("pun-agent:threads")).toBeNull();
	});

	it("writes a thread to the list on the first initialize() call, and only once", async () => {
		await adapter.initialize("thread-1");
		let { threads } = await adapter.list();
		expect(threads).toHaveLength(1);
		expect(threads[0]).toMatchObject({
			remoteId: "thread-1",
			status: "regular",
		});

		// A second initialize() for the same thread (e.g. a second message in
		// the same conversation) must not duplicate the entry.
		await adapter.initialize("thread-1");
		({ threads } = await adapter.list());
		expect(threads).toHaveLength(1);
	});

	it("supports rename", async () => {
		await adapter.initialize("thread-1");
		await adapter.rename("thread-1", "About puns");
		const { threads } = await adapter.list();
		expect(threads[0]).toMatchObject({ title: "About puns" });
	});

	it("supports archive and unarchive", async () => {
		await adapter.initialize("thread-1");

		await adapter.archive("thread-1");
		let { threads } = await adapter.list();
		expect(threads[0]).toMatchObject({ status: "archived" });

		await adapter.unarchive("thread-1");
		({ threads } = await adapter.list());
		expect(threads[0]).toMatchObject({ status: "regular" });
	});

	it("supports delete", async () => {
		await adapter.initialize("thread-1");
		await adapter.initialize("thread-2");

		await adapter.delete("thread-1");

		const { threads } = await adapter.list();
		expect(threads.map((t) => t.remoteId)).toEqual(["thread-2"]);
	});

	it("persists through a fresh adapter instance over the same storage", async () => {
		await adapter.initialize("thread-1");

		const reloaded = createBrowserThreadListAdapter(storage);
		const { threads } = await reloaded.list();
		expect(threads).toHaveLength(1);
		expect(threads[0]).toMatchObject({ remoteId: "thread-1" });
	});
});
