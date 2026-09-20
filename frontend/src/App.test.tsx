import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { createStubChatModelAdapter } from "./lib/chat/stub-chat-model-adapter";
import { createFakeAsyncStorage } from "./lib/thread-list/fake-async-storage";
import { createBrowserThreadListAdapter } from "./lib/thread-list/local-storage-thread-list-adapter";

const renderApp = () => {
	const storage = createFakeAsyncStorage();
	return render(
		<App
			chatModelAdapter={createStubChatModelAdapter()}
			threadListAdapter={createBrowserThreadListAdapter(storage)}
		/>,
	);
};

const sendMessage = async (text: string) => {
	const composer = await screen.findByPlaceholderText("Send a message...");
	fireEvent.change(composer, { target: { value: text } });
	fireEvent.keyDown(composer, { key: "Enter", code: "Enter" });
};

describe("App", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("renders the greeting state with a prominent composer, and a header with just logo + name", async () => {
		renderApp();

		expect(
			await screen.findByText("How can I help you today?"),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("Send a message..."),
		).toBeInTheDocument();

		const header = screen.getByTestId("app-header");
		expect(within(header).getByText("Pun Agent")).toBeInTheDocument();
		// Only the sidebar trigger — no extra toolbar buttons.
		expect(within(header).getAllByRole("button")).toHaveLength(1);
	});

	it("transitions off the greeting state and streams the Phase 1 text reply", async () => {
		renderApp();
		await screen.findByText("How can I help you today?");

		await sendMessage("hello there");

		expect(await screen.findByText("hello there")).toBeInTheDocument();
		expect(
			screen.queryByText("How can I help you today?"),
		).not.toBeInTheDocument();

		expect(
			await screen.findByText(/stubbed backend/i, {}, { timeout: 3000 }),
		).toBeInTheDocument();
	});

	it("shows a loading indicator while the stub streams, and clears it once done", async () => {
		renderApp();
		await screen.findByText("How can I help you today?");

		await sendMessage("hello there");

		expect(
			await screen.findByRole("button", { name: "Stop generating" }),
		).toBeInTheDocument();

		await screen.findByText(/stubbed backend/i, {}, { timeout: 3000 });
		expect(
			await screen.findByRole("button", { name: "Send message" }),
		).toBeInTheDocument();
	});

	it("renders a tool call and follow-up text for the Phase 2 fixture", async () => {
		renderApp();
		await screen.findByText("How can I help you today?");

		await sendMessage("got a good pun for me?");

		expect(await screen.findByText(/let me take a look/i)).toBeInTheDocument();
		expect(
			await screen.findByText("1 tool call", {}, { timeout: 3000 }),
		).toBeInTheDocument();
		expect(
			await screen.findByText(/found one/i, {}, { timeout: 3000 }),
		).toBeInTheDocument();
	});

	it("renders an error state for a failed run", async () => {
		renderApp();
		await screen.findByText("How can I help you today?");

		await sendMessage("please error out");

		expect(
			await screen.findByText(/simulated failure/i, {}, { timeout: 3000 }),
		).toBeInTheDocument();
	});

	it("only adds a thread to the sidebar once the first message is sent", async () => {
		renderApp();
		await screen.findByText("How can I help you today?");

		expect(
			document.querySelectorAll('[data-slot="aui_thread-list-item"]'),
		).toHaveLength(0);

		await sendMessage("hello there");
		await screen.findByText(/stubbed backend/i, {}, { timeout: 3000 });

		const sidebarThreads = document.querySelectorAll(
			'[data-slot="aui_thread-list-item"]',
		);
		expect(sidebarThreads).toHaveLength(1);
	});

	it("never auto-resumes a prior thread on a fresh load", async () => {
		const storage = createFakeAsyncStorage();
		const priorThreads = createBrowserThreadListAdapter(storage);
		await priorThreads.initialize("prior-thread");
		await priorThreads.rename("prior-thread", "Yesterday's pun talk");

		render(
			<App
				chatModelAdapter={createStubChatModelAdapter()}
				threadListAdapter={createBrowserThreadListAdapter(storage)}
			/>,
		);

		// The prior thread is listed...
		expect(await screen.findByText("Yesterday's pun talk")).toBeInTheDocument();
		// ...but the active view is still a fresh, empty thread.
		expect(screen.getByText("How can I help you today?")).toBeInTheDocument();
	});
});
