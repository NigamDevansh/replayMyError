/**
 * Error Replay
 * 
 * A lightweight, universal package that records user actions in a circular buffer
 * and generates detailed error reports for debugging.
 * 
 * Works in both browser and server (Node.js) environments:
 * - Browser: captures clicks, inputs, navigation, network, console errors
 * - Server: captures console errors/warnings and uncaught exceptions
 */

import { CircularBuffer } from './core/circular-buffer';
import { isBrowser } from './utils/env';
import {
    UserAction,
    ErrorReplayConfig,
    ErrorReport,
    DetectorCleanup
} from './types';
import { DEFAULT_CONFIG, ResolvedConfig } from './core/config';
import { extractErrorInfo, getContext, buildActionsWithRelativeTime, generateReportId } from './core/report-builder';
import { startBrowserDetectors, installBrowserErrorHandlers, removeBrowserErrorHandlers, BrowserErrorHandlers } from './core/browser-handlers';
import { startServerDetectors, installServerErrorHandlers, removeServerErrorHandlers, ServerErrorHandlers } from './core/server-handlers';

export class ErrorReplay {
    private buffer: CircularBuffer<UserAction>;
    private config: ResolvedConfig;
    private cleanupFunctions: DetectorCleanup[] = [];
    private isRunning: boolean = false;
    private browserErrorHandlers: BrowserErrorHandlers | null = null;
    private serverErrorHandlers: ServerErrorHandlers | null = null;

    constructor(config: ErrorReplayConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.buffer = new CircularBuffer<UserAction>(this.config.maxActions);
    }

    /**
     * Start recording user actions.
     * 
     * Automatically detects the environment:
     * - **Browser**: tracks clicks, inputs, navigation, network, console, and global errors
     * - **Server (Node.js)**: tracks console errors/warnings and uncaught exceptions
     */
    start(): void {
        if (this.isRunning) {
            console.warn('ErrorReplay is already running');
            return;
        }

        this.isRunning = true;

        const addAction = (action: UserAction) => {
            this.buffer.add(action);
        };

        // Callback used by error handlers — captures, reports, and clears the buffer
        const captureAndReport = (error: Error | unknown) => {
            const report = this.capture(error);
            if (this.config.onError) {
                this.config.onError(report);
            }
            this.buffer.clear();
        };

        if (isBrowser()) {
            this.cleanupFunctions.push(...startBrowserDetectors(this.config, addAction));
            this.browserErrorHandlers = installBrowserErrorHandlers(captureAndReport);
        } else {
            this.cleanupFunctions.push(...startServerDetectors(this.config, addAction));
            this.serverErrorHandlers = installServerErrorHandlers(captureAndReport);
        }
    }

    /**
     * Stop recording user actions
     */
    stop(): void {
        if (!this.isRunning) return;

        this.isRunning = false;

        // Run all detector cleanup functions
        for (const cleanup of this.cleanupFunctions) {
            cleanup();
        }
        this.cleanupFunctions = [];

        // Remove error handlers
        if (isBrowser()) {
            removeBrowserErrorHandlers(this.browserErrorHandlers);
            this.browserErrorHandlers = null;
        } else {
            removeServerErrorHandlers(this.serverErrorHandlers);
            this.serverErrorHandlers = null;
        }
    }

    /**
     * Capture an error and generate a report.
     * Works in both browser and server environments.
     */
    capture(error: Error | unknown): ErrorReport {
        const report: ErrorReport = {
            reportId: generateReportId(),
            timestamp: new Date().toISOString(),
            error: extractErrorInfo(error),
            context: getContext(),
            actions: buildActionsWithRelativeTime(this.buffer.getAll())
        };

        if (this.config.user) {
            report.user = this.config.user;
        }

        return report;
    }

    /** Get all recorded actions */
    getActions(): UserAction[] {
        return this.buffer.getAll();
    }

    /** Clear all recorded actions */
    clear(): void {
        this.buffer.clear();
    }

    /** Stop recording and clear the buffer */
    cleanup(): void {
        this.stop();
        this.clear();
    }

    /** Check if recording is active */
    isActive(): boolean {
        return this.isRunning;
    }

    /** Get the number of buffered actions */
    actionCount(): number {
        return this.buffer.size();
    }
}

// ============================================
// Exports
// ============================================

export * from './types';
export { CircularBuffer } from './core/circular-buffer';
export { isBrowser } from './utils/env';

export default ErrorReplay;

// Expose to window for script tag usage
if (isBrowser()) {
    (window as any).ErrorReplay = ErrorReplay;
}
