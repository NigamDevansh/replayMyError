/**
 * Text Input Detector
 * 
 * Tracks text input and textarea changes with blur-based capture
 * and privacy-aware sanitization.
 */

import { InputAction, DetectorCleanup } from '../types';
import { getElementIdentifier } from '../utils/element-identifier';
import { getSafeInputValue } from '../utils/sanitizer';
import { getActionMetadata } from '../utils/action-metadata';
import { addCapturedListener } from '../utils/event-helpers';

export interface TextInputDetectorOptions {
    captureComponents: boolean;
    sanitizePatterns: string[];
    onAction: (action: InputAction) => void;
}

/**
 * Create a text input detector that tracks text inputs and textareas
 */
export function createTextInputDetector(options: TextInputDetectorOptions): DetectorCleanup {
    const { captureComponents, sanitizePatterns, onAction } = options;

    // Track previous values to detect clearing
    const previousValues = new WeakMap<Element, string>();

    const handleEvent = (event: Event, inputType: InputAction['inputType']) => {
        const target = event.target;

        // Only handle text inputs and textareas
        if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
            return;
        }

        // Skip hidden inputs, checkboxes, and radio buttons
        if (target instanceof HTMLInputElement) {
            const skipTypes = ['hidden', 'checkbox', 'radio', 'submit', 'button', 'reset', 'image'];
            if (skipTypes.includes(target.type)) {
                return;
            }
        }

        // Get element info
        const elementInfo = getElementIdentifier(target, captureComponents);

        // Get safe value with sanitization
        const { value, isSanitized } = getSafeInputValue(target, sanitizePatterns);

        // Check if input was cleared
        const prevValue = previousValues.get(target) || '';
        const wasCleared = prevValue.length > 0 && target.value.length === 0;
        previousValues.set(target, target.value);

        const action: InputAction = {
            type: 'input',
            element: elementInfo.identifier,
            component: elementInfo.component,
            inputType,
            value,
            valueLength: target.value.length,
            wasCleared,
            isSanitized,
            ...getActionMetadata()
        };

        onAction(action);
    };

    const handleChangeEvent = (event: Event) => handleEvent(event, 'change');
    const handleBlurEvent = (event: Event) => handleEvent(event, 'blur');

    // Add event listeners - only blur and change for complete value capture
    const cleanupChange = addCapturedListener(document, 'change', handleChangeEvent);
    const cleanupBlur = addCapturedListener(document, 'blur', handleBlurEvent);

    return () => {
        cleanupChange();
        cleanupBlur();
    };
}
