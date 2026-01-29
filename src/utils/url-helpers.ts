/**
 * URL Helpers Utility
 * 
 * Common URL manipulation functions.
 */

/**
 * Get the pathname and search query from a URL or current location.
 * 
 * @param url - Optional URL string or URL object. If not provided, uses current location.
 * @param includeHash - Whether to include the hash fragment (default: false)
 * @returns The path with query string (e.g., "/page?foo=bar")
 */
export function getPathWithQuery(url?: string | URL, includeHash: boolean = false): string {
    if (url) {
        const parsed = new URL(url.toString(), window.location.origin);
        return parsed.pathname + parsed.search + (includeHash ? parsed.hash : '');
    }
    return window.location.pathname + window.location.search + (includeHash ? window.location.hash : '');
}

/**
 * Get just the current pathname and search from window.location
 */
export function getCurrentPath(): string {
    return window.location.pathname + window.location.search;
}

/**
 * Get current path including hash fragment
 */
export function getCurrentPathWithHash(): string {
    return window.location.pathname + window.location.search + window.location.hash;
}
