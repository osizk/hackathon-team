// ?test=1 makes every wait 20x shorter and mutes the voice, for Playwright.
const params = new URLSearchParams(location.search);
export const TEST = params.has('test');
export const MUTED = TEST || params.has('mute');
export const T = (ms) => (TEST ? Math.round(ms / 20) : ms);
export const wait = (ms) => new Promise((r) => setTimeout(r, T(ms)));
