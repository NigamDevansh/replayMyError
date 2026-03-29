/**
 * Server Handlers
 * 
 * Sets up server-specific detectors (console capture) and
 * process-level error handlers (uncaughtException, unhandledRejection).
 */

import { UserAction, DetectorCleanup } from '../types';
import { ResolvedConfig } from './config';
import { createServerConsoleDetector } from '../detectors/server/console-detector';

/**
 * Initialize server-specific detectors based on config.
 * Currently captures console.error / console.warn.
 * Returns an array of cleanup functions.
 */
export function startServerDetectors(
    config: ResolvedConfig,
    addAction: (action: UserAction) => void
): DetectorCleanup[] {
    const cleanups: DetectorCleanup[] = [];

    if (config.trackConsole) {
        cleanups.push(createServerConsoleDetector({
            onAction: addAction
        }));
    }

    return cleanups;
}

/**
 * Handles returned from installServerErrorHandlers, used for cleanup.
 */
export interface ServerErrorHandlers {
    errorHandler: (error: Error) => void;
    rejectionHandler: (reason: unknown) => void;
}

/**
 * Install Node.js process-level error handlers:
 * - `process.on('uncaughtException')` for unhandled errors
 * - `process.on('unhandledRejection')` for unhandled promise rejections
 * 
 * Returns null if `process` is unavailable.
 */
export function installServerErrorHandlers(
    captureAndReport: (error: Error | unknown) => void
): ServerErrorHandlers | null {
    if (typeof process === 'undefined') return null;

    const errorHandler = (error: Error) => {
        captureAndReport(error);
    };
    process.on('uncaughtException', errorHandler);

    const rejectionHandler = (reason: unknown) => {
        captureAndReport(reason);
    };
    process.on('unhandledRejection', rejectionHandler);

    return { errorHandler, rejectionHandler };
}

/**
 * Remove previously installed server error handlers.
 */
export function removeServerErrorHandlers(handlers: ServerErrorHandlers | null): void {
    if (!handlers || typeof process === 'undefined') return;

    process.removeListener('uncaughtException', handlers.errorHandler);
    process.removeListener('unhandledRejection', handlers.rejectionHandler);
}
