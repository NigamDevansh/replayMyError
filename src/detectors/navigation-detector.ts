/**
 * Navigation Detector
 * 
 * Tracks page navigation including SPA route changes.
 */

import { NavigationAction, DetectorCleanup } from '../types';

export interface NavigationDetectorOptions {
    onAction: (action: NavigationAction) => void;
}

/**
 * Create a navigation detector that tracks page/route changes
 */
export function createNavigationDetector(options: NavigationDetectorOptions): DetectorCleanup {
    const { onAction } = options;

    let currentPath = window.location.pathname + window.location.search;

    const recordNavigation = (from: string, to: string) => {
        if (from === to) return; // Skip if same path

        const action: NavigationAction = {
            type: 'navigation',
            from,
            to,
            timestamp: Date.now(),
            page: to
        };

        onAction(action);
        currentPath = to;
    };

    // Monkey-patch history.pushState
    const originalPushState = history.pushState.bind(history);
    history.pushState = function (state, title, url) {
        const result = originalPushState(state, title, url);
        if (url) {
            const newPath = new URL(url.toString(), window.location.origin).pathname +
                new URL(url.toString(), window.location.origin).search;
            recordNavigation(currentPath, newPath);
        }
        return result;
    };

    // Monkey-patch history.replaceState
    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = function (state, title, url) {
        const result = originalReplaceState(state, title, url);
        if (url) {
            const newPath = new URL(url.toString(), window.location.origin).pathname +
                new URL(url.toString(), window.location.origin).search;
            recordNavigation(currentPath, newPath);
        }
        return result;
    };

    // Listen for popstate (back/forward button)
    const handlePopState = () => {
        const newPath = window.location.pathname + window.location.search;
        recordNavigation(currentPath, newPath);
    };
    window.addEventListener('popstate', handlePopState);

    // Listen for hashchange
    const handleHashChange = () => {
        const newPath = window.location.pathname + window.location.search + window.location.hash;
        recordNavigation(currentPath, newPath);
    };
    window.addEventListener('hashchange', handleHashChange);

    // Return cleanup function
    return () => {
        // Restore original methods
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;

        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('hashchange', handleHashChange);
    };
}
