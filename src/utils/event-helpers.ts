/**
 * Event Helpers Utility
 * 
 * Common patterns for event listener management.
 */

import { DetectorCleanup } from '../types';

/**
 * Add a captured, passive event listener and return a cleanup function.
 * This pattern is used across all detectors.
 */
export function addCapturedListener(
    target: EventTarget,
    event: string,
    handler: EventListener
): DetectorCleanup {
    target.addEventListener(event, handler, { capture: true, passive: true });
    return () => {
        target.removeEventListener(event, handler, { capture: true } as EventListenerOptions);
    };
}

/**
 * Add multiple captured, passive event listeners and return a combined cleanup function.
 */
export function addCapturedListeners(
    target: EventTarget,
    events: string[],
    handler: EventListener
): DetectorCleanup {
    const cleanups = events.map(event => addCapturedListener(target, event, handler));
    return () => {
        cleanups.forEach(cleanup => cleanup());
    };
}
