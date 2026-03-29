/**
 * Report Builder
 * 
 * Pure utility functions for building error reports:
 * - Extracting error info from unknown error types
 * - Building environment context (browser or server)
 * - Formatting relative timestamps
 * - Generating unique report IDs
 */

import { isBrowser } from '../utils/env';
import {
    ErrorInfo,
    ContextInfo,
    ActionWithRelativeTime,
    UserAction
} from '../types';

/**
 * Extract structured error information from any thrown value.
 */
export function extractErrorInfo(error: Error | unknown): ErrorInfo {
    if (error instanceof Error) {
        return {
            message: error.message,
            type: error.constructor.name,
            stack: error.stack
        };
    }

    if (typeof error === 'string') {
        return {
            message: error,
            type: 'Error'
        };
    }

    return {
        message: String(error),
        type: 'Unknown'
    };
}

/**
 * Gather environment context — returns browser context or server context
 * depending on the runtime.
 */
export function getContext(): ContextInfo {
    if (isBrowser()) {
        return {
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            platform: 'web',
            timestamp: new Date().toISOString()
        };
    }

    // Server context
    return {
        url: 'server',
        userAgent: `Node.js/${typeof process !== 'undefined' ? process.version : 'unknown'}`,
        viewport: { width: 0, height: 0 },
        platform: 'server',
        timestamp: new Date().toISOString()
    };
}

/**
 * Augment buffered actions with human-readable relative timestamps.
 */
export function buildActionsWithRelativeTime(actions: UserAction[]): ActionWithRelativeTime[] {
    const now = Date.now();

    return actions.map(action => ({
        ...action,
        relativeTime: formatRelativeTime(action.timestamp, now)
    }));
}

/**
 * Format a timestamp as a relative time string (e.g. "-2m 30s").
 */
export function formatRelativeTime(timestamp: number, now: number): string {
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);

    if (seconds === 0) {
        return '0s';
    }

    if (seconds < 60) {
        return `-${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
        return remainingSeconds > 0
            ? `-${minutes}m ${remainingSeconds}s`
            : `-${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `-${hours}h ${remainingMinutes}m`;
}

/**
 * Generate a unique report ID (e.g. "err_m3k7x2_a9b3f1").
 */
export function generateReportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `err_${timestamp}_${random}`;
}
