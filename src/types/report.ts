/**
 * Error Report Type Definitions
 * 
 * Interfaces for the error report output that ErrorReplay generates.
 */

import { UserAction } from './actions';

export interface ErrorInfo {
    message: string;
    type: string;
    stack?: string;
    componentStack?: string;
}

export interface ContextInfo {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    platform: string;
    timestamp: string;
}

export type ActionWithRelativeTime = UserAction & {
    relativeTime: string;
};

export interface ErrorReport {
    reportId: string;
    timestamp: string;
    error: ErrorInfo;
    context: ContextInfo;
    user?: {
        id?: string;
        sessionId?: string;
        [key: string]: unknown;
    };
    actions: ActionWithRelativeTime[];
}
