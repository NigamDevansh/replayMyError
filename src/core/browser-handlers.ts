/**
 * Browser Handlers
 * 
 * Sets up browser-specific detectors (clicks, inputs, navigation, network, console)
 * and global error handlers (window 'error' + 'unhandledrejection').
 */

import { UserAction, ErrorReport, DetectorCleanup } from '../types';
import { ResolvedConfig } from './config';
import { createClickDetector } from '../detectors/browser/click-detector';
import { createInputDetector } from '../detectors/browser/input-detector';
import { createNavigationDetector } from '../detectors/browser/navigation-detector';
import { createNetworkDetector } from '../detectors/browser/network-detector';
import { createConsoleDetector } from '../detectors/browser/console-detector';

/**
 * Initialize all browser-specific event detectors based on config.
 * Returns an array of cleanup functions.
 */
export function startBrowserDetectors(
    config: ResolvedConfig,
    addAction: (action: UserAction) => void
): DetectorCleanup[] {
    const cleanups: DetectorCleanup[] = [];

    if (config.trackClicks) {
        cleanups.push(createClickDetector({
            captureComponents: config.captureComponents,
            onAction: addAction
        }));
    }

    if (config.trackInputs) {
        const trackConfig = typeof config.trackInputs === 'object'
            ? config.trackInputs
            : undefined;

        cleanups.push(createInputDetector({
            captureComponents: config.captureComponents,
            sanitizePatterns: config.sanitize,
            onAction: addAction,
            trackConfig
        }));
    }

    if (config.trackNavigation) {
        cleanups.push(createNavigationDetector({
            onAction: addAction
        }));
    }

    if (config.trackNetwork) {
        cleanups.push(createNetworkDetector({
            onAction: addAction
        }));
    }

    if (config.trackConsole) {
        cleanups.push(createConsoleDetector({
            onAction: addAction
        }));
    }

    return cleanups;
}

/**
 * Handles returned from installBrowserErrorHandlers, used for cleanup.
 */
export interface BrowserErrorHandlers {
    errorHandler: (event: ErrorEvent) => void;
    rejectionHandler: (event: PromiseRejectionEvent) => void;
}

/**
 * Install global browser error handlers:
 * - `window.onerror` for uncaught exceptions
 * - `window.onunhandledrejection` for unhandled promise rejections
 * 
 * Each error triggers report generation via the provided `captureAndReport` callback.
 */
export function installBrowserErrorHandlers(
    captureAndReport: (error: Error | unknown) => void
): BrowserErrorHandlers {
    const errorHandler = (event: ErrorEvent) => {
        captureAndReport(event.error || event.message);
    };
    window.addEventListener('error', errorHandler);

    const rejectionHandler = (event: PromiseRejectionEvent) => {
        captureAndReport(event.reason);
    };
    window.addEventListener('unhandledrejection', rejectionHandler);

    return { errorHandler, rejectionHandler };
}

/**
 * Remove previously installed browser error handlers.
 */
export function removeBrowserErrorHandlers(handlers: BrowserErrorHandlers | null): void {
    if (!handlers) return;

    window.removeEventListener('error', handlers.errorHandler);
    window.removeEventListener('unhandledrejection', handlers.rejectionHandler);
}
