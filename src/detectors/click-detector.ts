/**
 * Click Detector
 * 
 * Tracks all click and touch events on the document.
 */

import { ClickAction, DetectorCleanup } from '../types';
import { getElementIdentifier } from '../utils/element-identifier';
import { getActionMetadata } from '../utils/action-metadata';
import { addCapturedListeners } from '../utils/event-helpers';

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
            ...getActionMetadata()
        };

        onAction(action);
    };

    // Add event listeners with cleanup
    return addCapturedListeners(document, ['click', 'touchstart'], handleClick as EventListener);
}
