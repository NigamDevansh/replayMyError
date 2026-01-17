/**
 * Click Detector
 * 
 * Tracks all click and touch events on the document.
 */

import { ClickAction, DetectorCleanup } from '../types';
import { getElementIdentifier } from '../utils/element-identifier';

export interface ClickDetectorOptions {
    captureComponents: boolean;
    onAction: (action: ClickAction) => void;
}

/**
 * Create a click detector that tracks all click/touch events
 */
export function createClickDetector(options: ClickDetectorOptions): DetectorCleanup {
    const { captureComponents, onAction } = options;

    const handleClick = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Element;
        if (!target) return;

        // Get position
        let x = 0;
        let y = 0;

        if (event instanceof MouseEvent) {
            x = event.clientX;
            y = event.clientY;
        } else if (event instanceof TouchEvent && event.touches.length > 0) {
            x = event.touches[0].clientX;
            y = event.touches[0].clientY;
        }

        // Get element info
        const elementInfo = getElementIdentifier(target, captureComponents);

        const action: ClickAction = {
            type: 'click',
            element: elementInfo.identifier,
            component: elementInfo.component,
            componentPath: elementInfo.componentPath,
            text: elementInfo.text,
            position: { x, y },
            timestamp: Date.now(),
            page: window.location.pathname
        };

        onAction(action);
    };

    // Add event listeners
    document.addEventListener('click', handleClick, { capture: true, passive: true });
    document.addEventListener('touchstart', handleClick, { capture: true, passive: true });

    // Return cleanup function
    return () => {
        document.removeEventListener('click', handleClick, { capture: true } as EventListenerOptions);
        document.removeEventListener('touchstart', handleClick, { capture: true } as EventListenerOptions);
    };
}
