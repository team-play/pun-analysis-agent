import { MessagesSquare } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

/** Logo + product name only, per docs/design/frontend-design.md — no toolbar. */
export function AppHeader() {
	return (
		<header
			data-testid="app-header"
			className="flex h-14 shrink-0 items-center gap-2 border-b px-3"
		>
			<SidebarTrigger />
			<div className="flex items-center gap-2">
				<div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
					<MessagesSquare className="size-3.5" aria-hidden />
				</div>
				<span className="text-sm font-semibold">Pun Agent</span>
			</div>
		</header>
	);
}
