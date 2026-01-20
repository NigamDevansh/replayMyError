/**
 * Select Detector
 * 
 * Tracks select dropdown changes.
 */

import { InputAction, DetectorCleanup } from '../types';
import { getElementIdentifier } from '../utils/element-identifier';

export interface SelectDetectorOptions {
    captureComponents: boolean;
    onAction: (action: InputAction) => void;
}

/**
 * Create a select detector that tracks dropdown selection changes
 */
export function createSelectDetector(options: SelectDetectorOptions): DetectorCleanup {
    const { captureComponents, onAction } = options;

    const handleChange = (event: Event) => {
        const target = event.target;

        // Only handle select elements
        if (!target || !(target instanceof HTMLSelectElement)) {
            return;
        }

        // Get element info
        const elementInfo = getElementIdentifier(target, captureComponents);

        // Get selected option text
        const selectedText = target.options[target.selectedIndex]?.text || target.value;

        const action: InputAction = {
            type: 'input',
            element: elementInfo.identifier,
            component: elementInfo.component,
            inputType: 'change',
            value: selectedText,
            valueLength: selectedText.length,
            wasCleared: false,
            isSanitized: false,
            timestamp: Date.now(),
            page: window.location.pathname
        };

        onAction(action);
    };

    // Only listen to change events for selects
    document.addEventListener('change', handleChange, { capture: true, passive: true });

    return () => {
        document.removeEventListener('change', handleChange, { capture: true } as EventListenerOptions);
    };
}
