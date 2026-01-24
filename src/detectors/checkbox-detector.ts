/**
 * Checkbox Detector
 * 
 * Tracks checkbox and radio button state changes.
 */

import { InputAction, DetectorCleanup } from '../types';
import { getElementIdentifier } from '../utils/element-identifier';
import { getActionMetadata } from '../utils/action-metadata';
import { addCapturedListener } from '../utils/event-helpers';

export interface CheckboxDetectorOptions {
    captureComponents: boolean;
    onAction: (action: InputAction) => void;
}

/**
 * Create a checkbox detector that tracks checkbox and radio button changes
 */
export function createCheckboxDetector(options: CheckboxDetectorOptions): DetectorCleanup {
    const { captureComponents, onAction } = options;

    const handleChange = (event: Event) => {
        const target = event.target;

        // Only handle checkboxes and radio buttons
        if (!target || !(target instanceof HTMLInputElement)) {
            return;
        }

        if (target.type !== 'checkbox' && target.type !== 'radio') {
            return;
        }

        // Get element info
        const elementInfo = getElementIdentifier(target, captureComponents);

        const action: InputAction = {
            type: 'input',
            element: elementInfo.identifier,
            component: elementInfo.component,
            inputType: 'change',
            value: target.checked ? 'checked' : 'unchecked',
            valueLength: 1,
            wasCleared: false,
            isSanitized: false,
            ...getActionMetadata()
        };

        onAction(action);
    };

    // Only listen to change events for checkboxes/radios
    return addCapturedListener(document, 'change', handleChange);
}
