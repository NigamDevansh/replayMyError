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
    UserConfig,
    ErrorReport,
    DetectorCleanup
} from './types';
import { DEFAULT_CONFIG, ResolvedConfig } from './core/config';
import { extractErrorInfo, getContext, buildActionsWithRelativeTime, generateReportId } from './core/report-builder';
import { startBrowserDetectors, installBrowserErrorHandlers, removeBrowserErrorHandlers, BrowserErrorHandlers } from './core/browser-handlers';
import { startServerDetectors, installServerErrorHandlers, removeServerErrorHandlers, ServerErrorHandlers } from './core/server-handlers';
import { SlackIntegration } from './integrations/slack';

export class ErrorReplay {
    private buffer: CircularBuffer<UserAction>;
    private config: ResolvedConfig;
    private cleanupFunctions: DetectorCleanup[] = [];
    private isRunning: boolean = false;
    private browserErrorHandlers: BrowserErrorHandlers | null = null;
    private serverErrorHandlers: ServerErrorHandlers | null = null;
    private slackIntegration: SlackIntegration | null = null;

    constructor(config: ErrorReplayConfig) {
        if (!config || !config.user || !config.user.id) {
            throw new Error('[ErrorReplay] config.user.id is required.');
        }

        // Validate groupByField dotted path
        if (config.slack?.groupByField) {
            const field = config.slack.groupByField;
            if (field.startsWith('metadata.')) {
                const metaKey = field.slice('metadata.'.length);
                if (!config.user.metadata || !(metaKey in config.user.metadata)) {
                    console.warn(
                        `[ErrorReplay] slack.groupByField "${field}" — key "${metaKey}" ` +
                        `not found in user.metadata. Falling back to "id".`
                    );
                }
            } else if (!(field in config.user)) {
                console.warn(
                    `[ErrorReplay] slack.groupByField "${field}" not found in user config. ` +
                    `Available: id, name, email, sessionId, metadata.<key>. Falling back to "id".`
                );
            }
        }

        this.config = { ...DEFAULT_CONFIG, ...config } as ResolvedConfig;
        this.buffer = new CircularBuffer<UserAction>(this.config.maxActions);

        if (config.slack?.token && config.slack?.enabled !== false) {
            this.slackIntegration = new SlackIntegration(config.slack);
        }
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
            if (this.slackIntegration) {
                this.slackIntegration.sendReport(report).catch(err => {
                    console.error('[ErrorReplay] Failed to send to Slack:', err);
                });
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
        return {
            reportId: generateReportId(),
            timestamp: new Date().toISOString(),
            error: extractErrorInfo(error),
            context: getContext(),
            user: this.config.user,
            actions: buildActionsWithRelativeTime(this.buffer.getAll())
        };
    }

    /**
     * Update the user identity dynamically (e.g. after login or API fetch).
     */
    setUser(user: UserConfig): void {
        if (!user || !user.id) {
            throw new Error('[ErrorReplay] user.id is required.');
        }
        this.config.user = user;
    }

    /**
     * Manually send a report to Slack.
     * Resolves when Slack delivery is confirmed.
     */
    async sendToSlack(report: ErrorReport): Promise<void> {
        if (!this.slackIntegration) {
            console.warn('[ErrorReplay] Slack is not configured.');
            return;
        }
        await this.slackIntegration.sendReport(report);
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
export { SlackIntegration } from './integrations/slack';
export { defineConfig } from './types/config';

export default ErrorReplay;

// Expose to window for script tag usage
if (isBrowser()) {
    (window as any).ErrorReplay = ErrorReplay;
}
