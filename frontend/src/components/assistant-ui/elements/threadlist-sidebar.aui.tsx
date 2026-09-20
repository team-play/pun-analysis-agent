import type * as React from "react";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import { OtterMark } from "@/components/icons/otter-mark";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";

export function ThreadListSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar {...props}>
			<SidebarHeader className="aui-sidebar-header mb-2 border-b">
				<div className="aui-sidebar-header-content flex items-center justify-between">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" className="cursor-default">
								<div className="aui-sidebar-header-icon-wrapper bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<OtterMark className="aui-sidebar-header-icon size-5" />
								</div>
								<div className="aui-sidebar-header-heading me-6 flex flex-col gap-0.5 leading-none">
									<span className="aui-sidebar-header-title font-semibold">
										Pun Agent
									</span>
								</div>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</div>
			</SidebarHeader>
			<SidebarContent className="aui-sidebar-content px-2">
				<ThreadList />
			</SidebarContent>
			<SidebarFooter className="aui-sidebar-footer group-data-[collapsible=icon]:hidden border-t px-2 py-3">
				<p className="text-sidebar-foreground/60 text-center text-xs leading-relaxed text-balance">
					Made with 🦦tter love by Team PLAY
					<br />
					(CNIT-58100)
				</p>
			</SidebarFooter>
			{props.collapsible !== "none" && <SidebarRail />}
		</Sidebar>
	);
}
