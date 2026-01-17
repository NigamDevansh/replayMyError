/**
 * React Component Detector
 * 
 * Detects React component names from DOM elements by inspecting React fiber nodes.
 */

export interface ReactComponentInfo {
    name: string;
    path: string;
}

/**
 * Get React component information for a DOM element
 */
export function getReactComponentInfo(element: Element): ReactComponentInfo | null {
    try {
        const fiber = getReactFiber(element);
        if (!fiber) {
            return null;
        }

        const componentPath: string[] = [];
        let componentName: string | null = null;
        let currentFiber = fiber;

        // Walk up the fiber tree to find component names
        while (currentFiber) {
            const name = getFiberComponentName(currentFiber);
            if (name) {
                if (!componentName) {
                    componentName = name;
                }
                // Don't add duplicates and limit path length
                if (componentPath.length < 5 && !componentPath.includes(name)) {
                    componentPath.unshift(name);
                }
            }
            currentFiber = currentFiber.return;
        }

        if (componentName) {
            return {
                name: componentName,
                path: componentPath.join(' > ')
            };
        }

        return null;
    } catch {
        // React might not be present or fiber structure might be different
        return null;
    }
}

/**
 * Find the React fiber node attached to a DOM element
 */
function getReactFiber(element: Element): any {
    // React 17+ uses __reactFiber$
    // React 16 uses __reactInternalInstance$
    const keys = Object.keys(element);

    const fiberKey = keys.find(key =>
        key.startsWith('__reactFiber$') ||
        key.startsWith('__reactInternalInstance$')
    );

    if (fiberKey) {
        return (element as any)[fiberKey];
    }

    return null;
}

/**
 * Get the component name from a fiber node
 */
function getFiberComponentName(fiber: any): string | null {
    if (!fiber) return null;

    // Function components and class components
    if (fiber.type) {
        // Function component or class component
        if (typeof fiber.type === 'function') {
            const name = fiber.type.displayName || fiber.type.name;
            // Filter out React internal components
            if (name && !isReactInternalComponent(name)) {
                return name;
            }
        }

        // forwardRef components
        if (fiber.type.render) {
            const name = fiber.type.render.displayName || fiber.type.render.name;
            if (name && !isReactInternalComponent(name)) {
                return name;
            }
        }

        // memo components
        if (fiber.type.$$typeof?.toString() === 'Symbol(react.memo)') {
            const innerType = fiber.type.type;
            if (typeof innerType === 'function') {
                const name = innerType.displayName || innerType.name;
                if (name && !isReactInternalComponent(name)) {
                    return name;
                }
            }
        }
    }

    return null;
}

/**
 * Check if a component name is a React internal component
 */
function isReactInternalComponent(name: string): boolean {
    const internalNames = [
        'Fragment',
        'StrictMode',
        'Suspense',
        'SuspenseList',
        'Profiler',
        'Provider',
        'Consumer',
        'Context',
        'Portal'
    ];

    return internalNames.includes(name) || name.startsWith('_');
}

/**
 * Check if React is present on the page
 */
export function isReactPresent(): boolean {
    try {
        // Check for React DevTools hook
        if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            return true;
        }

        // Check for any element with React fiber
        const testElement = document.body.firstElementChild;
        if (testElement) {
            const keys = Object.keys(testElement);
            return keys.some(key =>
                key.startsWith('__reactFiber') ||
                key.startsWith('__reactInternalInstance')
            );
        }

        return false;
    } catch {
        return false;
    }
}
