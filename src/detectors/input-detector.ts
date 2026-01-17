/**
 * Input Detector
 * 
 * Tracks form input changes with privacy-aware sanitization.
 */

import { InputAction, DetectorCleanup } from '../types';
import { getElementIdentifier } from '../utils/element-identifier';
import { getSafeInputValue } from '../utils/sanitizer';

export interface InputDetectorOptions {
    captureComponents: boolean;
    sanitizePatterns: string[];
    onAction: (action: InputAction) => void;
}

/**
 * Create an input detector that tracks form input changes
 */
export function createInputDetector(options: InputDetectorOptions): DetectorCleanup {
    const { captureComponents, sanitizePatterns, onAction } = options;

    // Track previous values to detect clearing
    const previousValues = new WeakMap<Element, string>();

    const handleInput = (event: Event, inputType: InputAction['inputType']) => {
        const target = event.target;
        if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
            return;
        }

        // Skip hidden inputs
        if (target instanceof HTMLInputElement && target.type === 'hidden') {
            return;
        }

        // Get element info
        const elementInfo = getElementIdentifier(target, captureComponents);

        // Get safe value
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
            timestamp: Date.now(),
            page: window.location.pathname
        };

        onAction(action);
    };

    const handleInputEvent = (event: Event) => handleInput(event, 'input');
    const handleChangeEvent = (event: Event) => handleInput(event, 'change');
    const handleFocusEvent = (event: Event) => handleInput(event, 'focus');
    const handleBlurEvent = (event: Event) => handleInput(event, 'blur');

    // Add event listeners
    document.addEventListener('input', handleInputEvent, { capture: true, passive: true });
    document.addEventListener('change', handleChangeEvent, { capture: true, passive: true });
    document.addEventListener('focus', handleFocusEvent, { capture: true, passive: true });
    document.addEventListener('blur', handleBlurEvent, { capture: true, passive: true });

    // Return cleanup function
    return () => {
        document.removeEventListener('input', handleInputEvent, { capture: true } as EventListenerOptions);
        document.removeEventListener('change', handleChangeEvent, { capture: true } as EventListenerOptions);
        document.removeEventListener('focus', handleFocusEvent, { capture: true } as EventListenerOptions);
        document.removeEventListener('blur', handleBlurEvent, { capture: true } as EventListenerOptions);
    };
}
