/**
 * Console Detector
 * 
 * Captures console.error and console.warn calls.
 */

import { ConsoleAction, DetectorCleanup } from '../types';

export interface ConsoleDetectorOptions {
    onAction: (action: ConsoleAction) => void;
}

/**
 * Create a console detector that captures error and warning logs
 */
export function createConsoleDetector(options: ConsoleDetectorOptions): DetectorCleanup {
    const { onAction } = options;

    // Store original methods
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    const captureConsole = (level: 'error' | 'warn', args: any[]) => {
        // Convert arguments to strings
        const message = args.map(arg => {
            if (arg instanceof Error) {
                return arg.message;
            }
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        const action: ConsoleAction = {
            type: 'console',
            level,
            message: message.slice(0, 500), // Limit message length
            args: args.slice(0, 5).map(arg => {
                if (typeof arg === 'string') return arg.slice(0, 100);
                if (arg instanceof Error) return arg.message;
                return typeof arg;
            }),
            timestamp: Date.now(),
            page: window.location.pathname
        };

        onAction(action);
    };

    // Override console.error
    console.error = function (...args: any[]) {
        captureConsole('error', args);
        return originalError(...args);
    };

    // Override console.warn
    console.warn = function (...args: any[]) {
        captureConsole('warn', args);
        return originalWarn(...args);
    };

    // Return cleanup function
    return () => {
        console.error = originalError;
        console.warn = originalWarn;
    };
}
