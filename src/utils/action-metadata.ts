/**
 * Action Metadata Utility
 * 
 * Common metadata fields used across all action types.
 */

export interface ActionMetadata {
    timestamp: number;
    page: string;
}

/**
 * Get common metadata for user actions (timestamp and current page)
 */
export function getActionMetadata(): ActionMetadata {
    return {
        timestamp: Date.now(),
        page: window.location.pathname
    };
}
