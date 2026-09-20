import type * as React from "react";

/**
 * The team's otter mascot, reduced to a lucide-style line icon (24x24,
 * `currentColor` stroke) so it drops into the same slots the generic
 * MessagesSquare icon used to fill — header badge, sidebar badge, etc.
 */
export function OtterMark(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			role="img"
			aria-label="Pun Agent otter mascot"
			{...props}
		>
			<title>Otter mascot</title>
			{/* Ears */}
			<circle cx="6.5" cy="7" r="1.6" />
			<circle cx="17.5" cy="7" r="1.6" />
			{/* Head */}
			<path d="M4.5 13.5C4.5 8.8 7.9 5 12 5s7.5 3.8 7.5 8.5c0 4.1-3.4 6.8-7.5 6.8s-7.5-2.7-7.5-6.8Z" />
			{/* Glasses */}
			<circle cx="8.7" cy="12.5" r="2.1" />
			<circle cx="15.3" cy="12.5" r="2.1" />
			<path d="M10.8 12.5h2.4" />
			{/* Nose + smile */}
			<path d="M12 15.1v.9" />
			<path d="M9.6 17.4c.7.6 1.5.9 2.4.9s1.7-.3 2.4-.9" />
			{/* Whiskers */}
			<path d="M4.8 15.2 2.5 14.6" />
			<path d="M4.8 16.6 2.3 16.8" />
			<path d="M19.2 15.2l2.3-.6" />
			<path d="M19.2 16.6l2.5.2" />
		</svg>
	);
}
