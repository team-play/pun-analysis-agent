import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { punResult } from "./lib/chat/fixtures/analyze-results";
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
	const composer = await screen.findByPlaceholderText(
		"Type a phrase and I'll sniff out the pun...",
	);
	fireEvent.change(composer, { target: { value: text } });
	fireEvent.keyDown(composer, { key: "Enter", code: "Enter" });
};

describe("App", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("renders the greeting state with a prominent composer, and a header with just logo + name", async () => {
		renderApp();

		expect(await screen.findByText("Got a pun for me?")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(
				"Type a phrase and I'll sniff out the pun...",
			),
		).toBeInTheDocument();

		const header = screen.getByTestId("app-header");
		expect(within(header).getByText("Pun Agent")).toBeInTheDocument();
		// Only the sidebar trigger — no extra toolbar buttons.
		expect(within(header).getAllByRole("button")).toHaveLength(1);
	});

	it("transitions off the greeting state and streams the Phase 1 text reply", async () => {
		renderApp();
		await screen.findByText("Got a pun for me?");

		await sendMessage("hello there");

		expect(await screen.findByText("hello there")).toBeInTheDocument();
		expect(screen.queryByText("Got a pun for me?")).not.toBeInTheDocument();

		expect(
			await screen.findByText(/stubbed backend/i, {}, { timeout: 3000 }),
		).toBeInTheDocument();
	});

	it("shows a loading indicator while the stub streams, and clears it once done", async () => {
		renderApp();
		await screen.findByText("Got a pun for me?");

		await sendMessage("hello there");

		expect(
			await screen.findByRole("button", { name: "Stop generating" }),
		).toBeInTheDocument();

		await screen.findByText(/stubbed backend/i, {}, { timeout: 3000 });
		expect(
			await screen.findByRole("button", { name: "Send message" }),
		).toBeInTheDocument();
	});

	describe("analyze_pun tool calls", () => {
		const findCard = (verdict: string | RegExp) =>
			screen.findByRole("button", { name: verdict }, { timeout: 3000 });

		it("renders the call as a collapsed card, between the reply's text parts", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");

			await sendMessage("got a good pun for me?");

			const preamble = await screen.findByText(/let me take a look/i);
			const card = await findCard("Pun (homographic), Pun score 94%");
			const followUp = await screen.findByText(
				/found one/i,
				{},
				{ timeout: 3000 },
			);
			expect(preamble.compareDocumentPosition(card)).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
			expect(card.compareDocumentPosition(followUp)).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
			// Collapsed: the explanation and the raw response wait for a click.
			expect(card).toHaveAttribute("aria-expanded", "false");
			expect(screen.queryByText(/"sense_source": "wordnet"/)).toBeNull();
		});

		it("shows the marked pun word, the explanation, then the class probabilities once opened", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");
			await sendMessage("got a good pun for me?");

			fireEvent.click(await findCard("Pun (homographic), Pun score 94%"));

			const word = await screen.findByText("dough", { selector: "mark" });
			const explanation = await screen.findByText(/informal terms for money/, {
				selector: "p",
			});
			const probabilities = screen.getByRole("list", {
				name: "Classifier probabilities",
			});
			expect(probabilities).toHaveTextContent(
				"Homographic 81%Homophonic 13%Not a pun 6%",
			);
			expect(word.compareDocumentPosition(explanation)).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
			expect(explanation.compareDocumentPosition(probabilities)).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
		});

		it("keeps Inference's raw response behind its own toggle", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");
			await sendMessage("got a good pun for me?");
			fireEvent.click(await findCard("Pun (homographic), Pun score 94%"));

			const toggle = await screen.findByRole("button", {
				name: "Raw response",
			});
			expect(toggle).toHaveAttribute("aria-expanded", "false");
			expect(screen.queryByText(/"sense_source"/)).toBeNull();

			fireEvent.click(toggle);

			// Check the block's text: once highlighted, the JSON is split across
			// token spans (lazy-shiki-highlighter.test.tsx checks the colors).
			await waitFor(() =>
				expect(toggle.parentElement).toHaveTextContent(
					'"sense_source": "wordnet"',
				),
			);
		});

		it("says Gemini supplied the senses for an llm_fallback result", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");

			await sendMessage("show me the fallback");

			const card = await findCard(
				"Pun (homophonic), Pun score 81%, Senses supplied by Gemini, at lower confidence",
			);
			fireEvent.click(card);

			// No explanation of its own, but Inference still names the word.
			expect(
				await screen.findByText("knight", { selector: "mark" }),
			).toBeInTheDocument();
		});

		it("says Inference couldn't analyze an undetermined result, with no confidence or probabilities", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");

			await sendMessage("an undetermined one");

			// The exact name rules out a confidence alongside it.
			const card = await findCard("Inference couldn't analyze this");
			fireEvent.click(card);

			await screen.findByRole("button", { name: "Raw response" });
			expect(
				screen.queryByRole("list", { name: "Classifier probabilities" }),
			).toBeNull();
		});

		it("stays running while the call is slow, and shows it cancelled when the user stops", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");
			await sendMessage("a slow pun");

			await findCard("Checking for a pun…");
			fireEvent.click(screen.getByRole("button", { name: "Stop generating" }));

			expect(await findCard("Pun check cancelled")).toBeInTheDocument();
		});

		it("shows the call couldn't finish when the reply fails before its result, keeping the error box", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");

			await sendMessage("make the pun fail");

			expect(await findCard("Pun check couldn't finish")).toBeInTheDocument();
			expect(await screen.findByText(/simulated failure/i)).toBeInTheDocument();
		});
	});

	it("renders an error state for a failed run", async () => {
		renderApp();
		await screen.findByText("Got a pun for me?");

		await sendMessage("please error out");

		expect(
			await screen.findByText(/simulated failure/i, {}, { timeout: 3000 }),
		).toBeInTheDocument();
	});

	it("only adds a thread to the sidebar once the first message is sent", async () => {
		renderApp();
		await screen.findByText("Got a pun for me?");

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
		expect(screen.getByText("Got a pun for me?")).toBeInTheDocument();
	});

	describe("export and reset", () => {
		const writeText = vi.fn<(text: string) => Promise<void>>();

		beforeEach(() => {
			writeText.mockReset().mockResolvedValue(undefined);
			Object.defineProperty(navigator, "clipboard", {
				value: { writeText },
				configurable: true,
			});
		});

		afterEach(() => {
			Reflect.deleteProperty(navigator, "clipboard");
		});

		const sidebarItems = () =>
			document.querySelectorAll('[data-slot="aui_thread-list-item"]');
		const copyButtons = () =>
			screen.queryAllByRole("button", { name: "Copy as JSON" });
		/** Copy is disabled until the reply has finished, so wait for that. */
		const copyOpenThread = async () => {
			const button = await screen.findByRole("button", {
				name: "Copy as JSON",
			});
			await waitFor(() => expect(button).toBeEnabled());
			fireEvent.click(button);
			await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
			return JSON.parse(writeText.mock.calls[0][0]);
		};

		it("copies the open thread's live messages, with the analyze_pun result verbatim, not the saved copy", async () => {
			const storage = createFakeAsyncStorage();
			const setItem = vi.spyOn(storage, "setItem");
			render(
				<App
					chatModelAdapter={createStubChatModelAdapter()}
					threadListAdapter={createBrowserThreadListAdapter(storage)}
				/>,
			);
			await screen.findByText("Got a pun for me?");
			await sendMessage("got a good pun for me?");
			await screen.findByText(/found one/i, {}, { timeout: 3000 });

			// Once the finished reply is saved, change the saved copy: an export
			// read from storage would then differ from what's on screen.
			const messagesKey = await waitFor(() => {
				const call = setItem.mock.calls.findLast(
					([key, value]) =>
						key.includes(":messages:") && /found one/i.test(value),
				);
				expect(call).toBeDefined();
				return (call as [string, string])[0];
			});
			const saved = (await storage.getItem(messagesKey)) as string;
			await storage.setItem(
				messagesKey,
				saved.replaceAll("got a good pun for me?", "tampered"),
			);

			const exported = await copyOpenThread();
			expect(exported.threadId).toEqual(expect.any(String));
			expect(new Date(exported.exportedAt).toISOString()).toBe(
				exported.exportedAt,
			);
			expect(exported.messages).toEqual([
				{
					role: "user",
					content: [{ type: "text", text: "got a good pun for me?" }],
				},
				{
					role: "assistant",
					content: [
						{
							type: "text",
							text: expect.stringMatching(/let me take a look/i),
						},
						expect.objectContaining({
							type: "tool-call",
							toolName: "analyze_pun",
							result: punResult,
						}),
						{ type: "text", text: expect.stringMatching(/found one/i) },
					],
				},
			]);
			expect(
				await screen.findByRole("button", { name: "Copied" }),
			).toBeInTheDocument();
		});

		it("copies a Phase 1 thread as text-only parts", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");
			await sendMessage("hello there");
			await screen.findByText(/stubbed backend/i, {}, { timeout: 3000 });

			const { messages } = await copyOpenThread();
			const parts = messages.flatMap(
				(message: { content: { type: string }[] }) => message.content,
			);
			expect(parts.map((part: { type: string }) => part.type)).toEqual([
				"text",
				"text",
			]);
		});

		it("resets to the greeting via New Thread, keeping the previous thread in the sidebar", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");
			await sendMessage("hello there");
			await screen.findByText(/stubbed backend/i, {}, { timeout: 3000 });
			expect(copyButtons()).toHaveLength(1);

			fireEvent.click(screen.getByRole("button", { name: "New Thread" }));

			expect(await screen.findByText("Got a pun for me?")).toBeInTheDocument();
			expect(screen.queryByText("hello there")).not.toBeInTheDocument();
			expect(sidebarItems()).toHaveLength(1);
			// The previous thread is no longer the open one, so it can't be copied.
			expect(copyButtons()).toHaveLength(0);

			// ...and its saved messages are intact when reopened.
			fireEvent.click(
				sidebarItems()[0].querySelector(
					'[data-slot="aui_thread-list-item-trigger"]',
				) as HTMLElement,
			);
			expect(await screen.findByText("hello there")).toBeInTheDocument();
			expect(await screen.findByText(/stubbed backend/i)).toBeInTheDocument();
		});

		it("disables Copy as JSON while a reply is streaming", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");
			await sendMessage("a slow pun please");

			await screen.findByRole("button", { name: "Stop generating" });
			await waitFor(() =>
				expect(
					screen.getByRole("button", { name: "Copy as JSON" }),
				).toBeDisabled(),
			);

			fireEvent.click(screen.getByRole("button", { name: "Stop generating" }));
			await waitFor(() =>
				expect(
					screen.getByRole("button", { name: "Copy as JSON" }),
				).toBeEnabled(),
			);
		});

		it("offers Copy as JSON only on the open thread's entry", async () => {
			renderApp();
			await screen.findByText("Got a pun for me?");
			await sendMessage("hello there");
			await screen.findByText(/stubbed backend/i, {}, { timeout: 3000 });
			fireEvent.click(screen.getByRole("button", { name: "New Thread" }));
			await screen.findByText("Got a pun for me?");
			await sendMessage("hello again");
			await waitFor(() => expect(sidebarItems()).toHaveLength(2));

			const withCopy = [...sidebarItems()].filter((item) =>
				within(item as HTMLElement).queryByRole("button", {
					name: "Copy as JSON",
				}),
			);
			expect(withCopy).toHaveLength(1);
			expect(withCopy[0]).toHaveAttribute("data-active");
		});
	});
});
