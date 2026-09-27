import { type FC, lazy, Suspense } from "react";
// Type-only, so it's erased from the build and doesn't load the module.
import type { HighlighterProps } from "./shiki-highlighter.aui";

const ShikiHighlighter = lazy(async () => {
	const [{ SyntaxHighlighter }, { createCssVariablesTheme }] =
		await Promise.all([import("./shiki-highlighter.aui"), import("shiki")]);
	// Token colors are the --shiki-* variables in index.css (a Purdue
	// palette checked for WCAG AA), so they follow the site's light/dark
	// theme like every other color.
	const theme = createCssVariablesTheme({ name: "purdue" });
	const PurdueHighlighter: FC<HighlighterProps> = (props) => (
		<SyntaxHighlighter {...props} theme={theme} />
	);
	return { default: PurdueHighlighter };
});

/**
 * The Shiki SyntaxHighlighter in the site's code palette, loaded on first
 * use: Shiki adds ~65 kB gzipped to the main bundle, and most replies have
 * no code at all. Until it loads, the code shows unhighlighted.
 */
export const SyntaxHighlighter: FC<HighlighterProps> = (props) => (
	<Suspense
		fallback={
			<pre className={props.className}>
				<code>{props.code.trim()}</code>
			</pre>
		}
	>
		<ShikiHighlighter {...props} />
	</Suspense>
);
