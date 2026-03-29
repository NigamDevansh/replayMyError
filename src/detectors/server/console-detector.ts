/**
 * Server Console Detector
 * 
 * Captures console.error and console.warn calls in Node.js/server environments.
 * Uses the same ConsoleAction type so reports are consistent across environments.
 */

import { ConsoleAction, DetectorCleanup } from '../../types';
import { getActionMetadata } from '../../utils/action-metadata';

export interface ServerConsoleDetectorOptions {
    onAction: (action: ConsoleAction) => void;
}

/**
 * Create a server-side console detector that captures error and warning logs.
 */
export function createServerConsoleDetector(options: ServerConsoleDetectorOptions): DetectorCleanup {
    const { onAction } = options;

    // Store original methods
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    const captureConsole = (level: 'error' | 'warn', args: any[]) => {
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
            message: message.slice(0, 500),
            args: args.slice(0, 5).map(arg => {
                if (typeof arg === 'string') return arg.slice(0, 100);
                if (arg instanceof Error) return arg.message;
                return typeof arg;
            }),
            ...getActionMetadata()
        };

        onAction(action);
    };

    console.error = function (...args: any[]) {
        captureConsole('error', args);
        return originalError(...args);
    };

    console.warn = function (...args: any[]) {
        captureConsole('warn', args);
        return originalWarn(...args);
    };

    return () => {
        console.error = originalError;
        console.warn = originalWarn;
    };
}
