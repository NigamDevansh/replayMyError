/**
 * CSS Path Generator
 * 
 * Generates a CSS selector path for a DOM element as a last-resort identifier.
 * Walks up the DOM tree (max 5 levels) building a selector like:
 *   `div > ul > li:nth-child(2) > button`
 */

/**
 * Generate a CSS selector path for an element.
 * Stops at document.body or after 5 levels, whichever comes first.
 * Shortcuts when an ID is found (IDs are unique).
 */
export function getCSSPath(element: Element): string {
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
