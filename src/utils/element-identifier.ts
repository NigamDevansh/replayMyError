/**
 * Element Identifier Utility
 * 
 * Generates meaningful identifiers for DOM elements using a priority-based approach.
 */

import { getReactComponentInfo } from './react-detector';

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
        // Check for common test attribute variations
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
 * Generate a CSS selector path for an element
 */
function getCSSPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body && path.length < 5) {
        let selector = current.tagName.toLowerCase();

        if (current.id) {
            selector = `#${current.id}`;
            path.unshift(selector);
            break; // ID is unique, no need to go further
        }

        // Add nth-child if there are siblings with same tag
        const parent = current.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(
                child => child.tagName === current!.tagName
            );
            if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                selector += `:nth-child(${index})`;
            }
        }

        path.unshift(selector);
        current = current.parentElement;
    }

    return path.join(' > ');
}

/**
 * Get the tag name with any type attribute for inputs
 */
export function getInputType(element: HTMLInputElement): string {
    const type = element.type || 'text';
    return `input[type="${type}"]`;
}
