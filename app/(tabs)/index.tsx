/**
 * Home tab — after 2026-09-29 the Home tab now renders the new Today home.
 * The previous data-rich Home layout is preserved verbatim at /legacy-home
 * for reference and remains reachable via router.push('/legacy-home').
 */
export { default } from '../today';
