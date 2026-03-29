/**
 * Action Metadata Utility
 * 
 * Common metadata fields used across all action types.
 * Works in both browser and server environments.
 */

import { isBrowser } from './env';

export interface ActionMetadata {
    timestamp: number;
    page: string;
}

/**
 * Get common metadata for user actions (timestamp and current page).
 * Returns 'server' as the page when running outside a browser.
 */
export function getActionMetadata(): ActionMetadata {
    return {
        timestamp: Date.now(),
        page: isBrowser() ? window.location.pathname : 'server'
    };
}
