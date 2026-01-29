/**
 * Navigation Detector
 * 
 * Tracks page navigation including SPA route changes.
 */

import { NavigationAction, DetectorCleanup } from '../types';
import { getActionMetadata } from '../utils/action-metadata';
import { getPathWithQuery, getCurrentPath, getCurrentPathWithHash } from '../utils/url-helpers';

export interface NavigationDetectorOptions {
    onAction: (action: NavigationAction) => void;
}

/**
 * Create a navigation detector that tracks page/route changes
 */
export function createNavigationDetector(options: NavigationDetectorOptions): DetectorCleanup {
    const { onAction } = options;

    let currentPath = getCurrentPath();

    const recordNavigation = (from: string, to: string) => {
        if (from === to) return; // Skip if same path

        const action: NavigationAction = {
            type: 'navigation',
            from,
            to,
            ...getActionMetadata(),
            page: to  // Override page with 'to' for navigation
        };

        onAction(action);
        currentPath = to;
    };

    // Monkey-patch history.pushState
    const originalPushState = history.pushState.bind(history);
    history.pushState = function (state, title, url) {
        const result = originalPushState(state, title, url);
        if (url) {
            recordNavigation(currentPath, getPathWithQuery(url));
        }
        return result;
    };

    // Monkey-patch history.replaceState
    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = function (state, title, url) {
        const result = originalReplaceState(state, title, url);
        if (url) {
            recordNavigation(currentPath, getPathWithQuery(url));
        }
        return result;
    };

    // Listen for popstate (back/forward button)
    const handlePopState = () => {
        recordNavigation(currentPath, getCurrentPath());
    };
    window.addEventListener('popstate', handlePopState);

    // Listen for hashchange
    const handleHashChange = () => {
        recordNavigation(currentPath, getCurrentPathWithHash());
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
