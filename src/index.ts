/**
 * Error Replay
 * 
 * A lightweight package that records user actions in a circular buffer
 * and generates detailed error reports for debugging.
 */

import { CircularBuffer } from './circular-buffer';
import {
    UserAction,
    ErrorReplayConfig,
    ErrorReport,
    ErrorInfo,
    ContextInfo,
    ActionWithRelativeTime,
    DetectorCleanup
} from './types';
import { createClickDetector } from './detectors/click-detector';
import { createInputDetector } from './detectors/input-detector';
import { createNavigationDetector } from './detectors/navigation-detector';
import { createNetworkDetector } from './detectors/network-detector';
import { createConsoleDetector } from './detectors/console-detector';

// Default configuration
const DEFAULT_CONFIG: Required<Omit<ErrorReplayConfig, 'onError' | 'user'>> = {
    maxActions: 50,
    sanitize: [],
    captureComponents: true,
    trackClicks: true,
    trackInputs: true,
    trackNavigation: true,
    trackNetwork: true,
    trackConsole: true
};

export class ErrorReplay {
    private buffer: CircularBuffer<UserAction>;
    private config: Required<Omit<ErrorReplayConfig, 'onError' | 'user'>> & Pick<ErrorReplayConfig, 'onError' | 'user'>;
    private cleanupFunctions: DetectorCleanup[] = [];
    private isRunning: boolean = false;
    private errorHandler: ((event: ErrorEvent) => void) | null = null;
    private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

    constructor(config: ErrorReplayConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.buffer = new CircularBuffer<UserAction>(this.config.maxActions);
    }

    /**
     * Start recording user actions
     */
    start(): void {
        if (this.isRunning) {
            console.warn('ErrorReplay is already running');
            return;
        }

        this.isRunning = true;

        // Add action to buffer
        const addAction = (action: UserAction) => {
            this.buffer.add(action);
        };

        // Initialize detectors based on config
        if (this.config.trackClicks) {
            const cleanup = createClickDetector({
                captureComponents: this.config.captureComponents,
                onAction: addAction
            });
            this.cleanupFunctions.push(cleanup);
        }

        if (this.config.trackInputs) {
            // Handle both boolean and object config
            const trackConfig = typeof this.config.trackInputs === 'object'
                ? this.config.trackInputs
                : undefined;

            const cleanup = createInputDetector({
                captureComponents: this.config.captureComponents,
                sanitizePatterns: this.config.sanitize,
                onAction: addAction,
                trackConfig
            });
            this.cleanupFunctions.push(cleanup);
        }

        if (this.config.trackNavigation) {
            const cleanup = createNavigationDetector({
                onAction: addAction
            });
            this.cleanupFunctions.push(cleanup);
        }

        if (this.config.trackNetwork) {
            const cleanup = createNetworkDetector({
                onAction: addAction
            });
            this.cleanupFunctions.push(cleanup);
        }

        if (this.config.trackConsole) {
            const cleanup = createConsoleDetector({
                onAction: addAction
            });
            this.cleanupFunctions.push(cleanup);
        }

        // Install global error handlers
        this.installErrorHandlers();
    }

    /**
     * Stop recording user actions
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;

        // Run all cleanup functions
        for (const cleanup of this.cleanupFunctions) {
            cleanup();
        }
        this.cleanupFunctions = [];

        // Remove error handlers
        this.removeErrorHandlers();
    }

    /**
     * Capture an error and generate a report
     */
    capture(error: Error | unknown): ErrorReport {
        const errorInfo = this.extractErrorInfo(error);
        const context = this.getContext();
        const actions = this.getActionsWithRelativeTime();

        const report: ErrorReport = {
            reportId: this.generateReportId(),
            timestamp: new Date().toISOString(),
            error: errorInfo,
            context,
            actions
        };

        if (this.config.user) {
            report.user = this.config.user;
        }

        return report;
    }

    /**
     * Get all recorded actions
     */
    getActions(): UserAction[] {
        return this.buffer.getAll();
    }

    /**
     * Clear all recorded actions
     */
    clear(): void {
        this.buffer.clear();
    }

    /**
     * Clean up all resources
     */
    cleanup(): void {
        this.stop();
        this.clear();
    }

    /**
     * Check if recording is active
     */
    isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Get the number of recorded actions
     */
    actionCount(): number {
        return this.buffer.size();
    }

    // ============================================
    // Private Methods
    // ============================================

    private installErrorHandlers(): void {
        // Global error handler
        this.errorHandler = (event: ErrorEvent) => {
            const report = this.capture(event.error || event.message);
            if (this.config.onError) {
                this.config.onError(report);
            }
        };
        window.addEventListener('error', this.errorHandler);

        // Unhandled promise rejection handler
        this.rejectionHandler = (event: PromiseRejectionEvent) => {
            const report = this.capture(event.reason);
            if (this.config.onError) {
                this.config.onError(report);
            }
        };
        window.addEventListener('unhandledrejection', this.rejectionHandler);
    }

    private removeErrorHandlers(): void {
        if (this.errorHandler) {
            window.removeEventListener('error', this.errorHandler);
            this.errorHandler = null;
        }
        if (this.rejectionHandler) {
            window.removeEventListener('unhandledrejection', this.rejectionHandler);
            this.rejectionHandler = null;
        }
    }

    private extractErrorInfo(error: Error | unknown): ErrorInfo {
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

    private getContext(): ContextInfo {
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

    private getActionsWithRelativeTime(): ActionWithRelativeTime[] {
        const actions = this.buffer.getAll();
        const now = Date.now();

        return actions.map(action => ({
            ...action,
            relativeTime: this.formatRelativeTime(action.timestamp, now)
        }));
    }

    private formatRelativeTime(timestamp: number, now: number): string {
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

    private generateReportId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `err_${timestamp}_${random}`;
    }
}

// Export types
export * from './types';
export { CircularBuffer } from './circular-buffer';

// Default export
export default ErrorReplay;

// Expose to window for script tag usage
if (typeof window !== 'undefined') {
    (window as any).ErrorReplay = ErrorReplay;
}
