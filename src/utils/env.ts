/**
 * Environment Detection Utility
 * 
 * Helpers for detecting browser vs server environments.
 * Used to guard browser-only APIs from crashing in SSR contexts.
 */

/**
 * Check if the current environment is a browser.
 * Returns false in Node.js, Deno, Bun, and other non-browser runtimes.
 */
export function isBrowser(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined' &&
        typeof navigator !== 'undefined'
    );
}
