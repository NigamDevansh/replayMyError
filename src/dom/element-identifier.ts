/**
 * Element Identifier
 * 
 * Generates meaningful identifiers for DOM elements using a priority-based approach:
 *   1. ID attribute
 *   2. data-testid / data-component / data-test / data-cy
 *   3. Text content (buttons, links, labels)
 *   4. aria-label
 *   5. name attribute
 *   6. Class names
 *   7. CSS selector path (last resort)
 */

import { getReactComponentInfo } from './react-detector';
import { getCSSPath } from './css-path';

export interface ElementInfo {
    identifier: string;
    component?: string;
    componentPath?: string;
    text?: string;
}

/**
 * Get a meaningful identifier for a DOM element
 */
export function getElementIdentifier(element: Element, captureComponents: boolean = true): ElementInfo {
    const tagName = element.tagName.toLowerCase();
    const result: ElementInfo = {
        identifier: tagName
    };

    // Try React component detection first
    if (captureComponents) {
        const reactInfo = getReactComponentInfo(element);
        if (reactInfo) {
            result.component = reactInfo.name;
            result.componentPath = reactInfo.path;
        }
    }

    // Priority 1: ID attribute (best case)
    if (element.id) {
        result.identifier = `${tagName}#${element.id}`;
        return result;
    }

    // Priority 2: data-testid or data-component attributes
    const htmlElement = element as HTMLElement;
    if (htmlElement.dataset) {
        if (htmlElement.dataset.testid) {
            result.identifier = `${tagName}[data-testid="${htmlElement.dataset.testid}"]`;
            return result;
        }
        if (htmlElement.dataset.component) {
            result.identifier = `${tagName}[data-component="${htmlElement.dataset.component}"]`;
            return result;
        }
        if (htmlElement.dataset.test) {
            result.identifier = `${tagName}[data-test="${htmlElement.dataset.test}"]`;
            return result;
        }
        if (htmlElement.dataset.cy) {
            result.identifier = `${tagName}[data-cy="${htmlElement.dataset.cy}"]`;
            return result;
        }
    }

    // Also check for data-testid as attribute directly
    const testId = element.getAttribute('data-testid');
    if (testId) {
        result.identifier = `${tagName}[data-testid="${testId}"]`;
        return result;
    }

    // Priority 3: Text content for interactive elements
    if (['BUTTON', 'A', 'LABEL'].includes(element.tagName)) {
        const text = element.textContent?.trim().slice(0, 30);
        if (text) {
            result.text = text;
            result.identifier = `${tagName} "${text}"`;
            return result;
        }
    }

    // Priority 4: aria-label for accessibility
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
        result.identifier = `${tagName}[aria-label="${ariaLabel.slice(0, 30)}"]`;
        return result;
    }

    // Priority 5: name attribute for form elements
    const nameAttr = element.getAttribute('name');
    if (nameAttr) {
        result.identifier = `${tagName}[name="${nameAttr}"]`;
        return result;
    }

    // Priority 6: Class names (less reliable but better than nothing)
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (classes) {
            result.identifier = `${tagName}.${classes}`;
            return result;
        }
    }

    // Priority 7: CSS selector path (last resort)
    result.identifier = getCSSPath(element);
    return result;
}

/**
 * Get the tag name with any type attribute for inputs
 */
export function getInputType(element: HTMLInputElement): string {
    const type = element.type || 'text';
    return `input[type="${type}"]`;
}
