const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * Mirrors the OS light/dark preference onto `<html class="dark">`, live —
 * there's no in-app toggle (per docs/design/frontend-design.md, the header
 * is logo + team name only), so shadcn's `.dark` class strategy is driven
 * by `prefers-color-scheme` instead of a user control.
 */
export const syncColorScheme = (): (() => void) => {
	const media = window.matchMedia(DARK_MEDIA_QUERY);

	const apply = (query: MediaQueryList | MediaQueryListEvent) => {
		document.documentElement.classList.toggle("dark", query.matches);
	};

	apply(media);
	media.addEventListener("change", apply);

	return () => media.removeEventListener("change", apply);
};
