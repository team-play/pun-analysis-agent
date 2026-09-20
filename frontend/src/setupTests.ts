import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(cleanup);

// jsdom doesn't implement these; assistant-ui's Thread and shadcn's Sidebar
// both rely on them for layout/viewport measurement and responsive checks.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
window.ResizeObserver ??= ResizeObserverStub;

// jsdom doesn't implement scroll methods; assistant-ui's auto-scroll calls
// them on the message viewport.
Element.prototype.scrollTo ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

window.matchMedia ??= (query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: () => {},
	removeListener: () => {},
	addEventListener: () => {},
	removeEventListener: () => {},
	dispatchEvent: () => false,
});
