/**
 * Input Detector (Facade)
 * 
 * Combines all input-related detectors:
 * - Text inputs and textareas
 * - Checkboxes and radio buttons
 * - Select dropdowns
 */

import { InputAction, DetectorCleanup, TrackInputsConfig } from '../types';
import { createTextInputDetector } from './text-input-detector';
import { createCheckboxDetector } from './checkbox-detector';
import { createSelectDetector } from './select-detector';

export interface InputDetectorOptions {
    captureComponents: boolean;
    sanitizePatterns: string[];
    onAction: (action: InputAction) => void;
    /** Which input types to track - defaults to all if not specified */
    trackConfig?: TrackInputsConfig;
}

/**
 * Create a combined input detector that tracks form input types
 */
export function createInputDetector(options: InputDetectorOptions): DetectorCleanup {
    const { captureComponents, sanitizePatterns, onAction, trackConfig } = options;

    // Default to tracking all input types
    const track = {
        text: trackConfig?.text !== false,
        checkbox: trackConfig?.checkbox !== false,
        select: trackConfig?.select !== false
    };

    const cleanupFns: DetectorCleanup[] = [];

    // Initialize detectors based on config
    if (track.text) {
        cleanupFns.push(createTextInputDetector({
            captureComponents,
            sanitizePatterns,
            onAction
        }));
    }

    if (track.checkbox) {
        cleanupFns.push(createCheckboxDetector({
            captureComponents,
            onAction
        }));
    }

    if (track.select) {
        cleanupFns.push(createSelectDetector({
            captureComponents,
            onAction
        }));
    }

    // Return combined cleanup function
    return () => {
        cleanupFns.forEach(fn => fn());
    };
}
