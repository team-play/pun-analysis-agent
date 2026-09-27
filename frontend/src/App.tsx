import {
	AssistantRuntimeProvider,
	AuiConfig,
	type ChatModelAdapter,
	type RemoteThreadListAdapter,
	type Toolkit,
	Tools,
	useLocalRuntime,
	useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { AppHeader } from "@/components/app-header";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { ThreadListSidebar } from "@/components/assistant-ui/elements/threadlist-sidebar.aui";
import { AnalyzePunToolUI } from "@/components/pun/analyze-pun-tool-ui";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ANALYZE_PUN_TOOL_NAME } from "@/lib/chat/analyze-result";
import { getChatModelAdapter } from "@/lib/chat/get-chat-model-adapter";
import { createBrowserThreadListAdapter } from "@/lib/thread-list/local-storage-thread-list-adapter";

const defaultChatModelAdapter = getChatModelAdapter();
const defaultThreadListAdapter = createBrowserThreadListAdapter();

/**
 * How tool calls render. `analyze_pun` runs on Backend (`type: "backend"`),
 * so this only supplies its card; `standalone` shows the card where the call
 * happened in the reply, rather than folded into the "N tool calls" group.
 */
const toolkit: Toolkit = {
	[ANALYZE_PUN_TOOL_NAME]: {
		type: "backend",
		display: "standalone",
		render: AnalyzePunToolUI,
	},
};
const auiConfig = AuiConfig({ tools: Tools({ toolkit }) });

export type AppProps = {
	/** Overridable for tests; defaults to the build's real ChatModelAdapter (stub or live). */
	chatModelAdapter?: ChatModelAdapter;
	/** Overridable for tests; defaults to the real localStorage-backed adapter. */
	threadListAdapter?: RemoteThreadListAdapter;
};

function App({
	chatModelAdapter = defaultChatModelAdapter,
	threadListAdapter = defaultThreadListAdapter,
}: AppProps) {
	// No `threadId`/`initialThreadId` passed: every load starts on a fresh,
	// uncontrolled thread. Prior threads stay reachable from the sidebar but
	// are never auto-resumed.
	const runtime = useRemoteThreadListRuntime({
		adapter: threadListAdapter,
		// biome-ignore lint/correctness/useHookAtTopLevel: `runtimeHook` is assistant-ui's documented seam — useRemoteThreadListRuntime invokes it as a hook internally, at a stable position, once per mounted thread.
		runtimeHook: () => useLocalRuntime(chatModelAdapter),
	});

	return (
		<AssistantRuntimeProvider runtime={runtime} config={auiConfig}>
			<TooltipProvider>
				<SidebarProvider>
					<ThreadListSidebar />
					<SidebarInset>
						<AppHeader />
						<Thread />
					</SidebarInset>
				</SidebarProvider>
			</TooltipProvider>
		</AssistantRuntimeProvider>
	);
}

export default App;
