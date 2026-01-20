/**
 * Error Replay - Type Definitions
 */

// ============================================
// Action Types
// ============================================

export interface BaseAction {
    type: string;
    timestamp: number;
    page: string;
}

export interface ClickAction extends BaseAction {
    type: 'click';
    element: string;
    component?: string;
    componentPath?: string;
    text?: string;
    position: { x: number; y: number };
}

export interface InputAction extends BaseAction {
    type: 'input';
    element: string;
    component?: string;
    inputType: 'change' | 'blur';
    value: string;
    valueLength: number;
    wasCleared: boolean;
    isSanitized: boolean;
}

export interface NavigationAction extends BaseAction {
    type: 'navigation';
    from: string;
    to: string;
}

export interface NetworkAction extends BaseAction {
    type: 'network';
    url: string;
    method: string;
    status?: number;
    duration?: number;
    error?: string;
}

export interface ConsoleAction extends BaseAction {
    type: 'console';
    level: 'error' | 'warn';
    message: string;
    args?: string[];
}

export type UserAction = ClickAction | InputAction | NavigationAction | NetworkAction | ConsoleAction;

// ============================================
// Configuration
// ============================================

/**
 * Configuration for which input types to track.
 * All options default to `true` if not specified.
 * 
 * @example
 * // Track only text inputs, disable checkbox and select tracking
 * { text: true, checkbox: false, select: false }
 * 
 * @example
 * // Track everything except checkboxes
 * { checkbox: false }
 */
export interface TrackInputsConfig {
    /** 
     * Track text inputs (`<input type="text">`, `<input type="email">`, etc.) 
     * and textareas. Captured on blur (when user clicks outside).
     * @default true 
     */
    text?: boolean;

    /** 
     * Track checkboxes and radio buttons. 
     * Captures "checked" or "unchecked" state on change.
     * @default true 
     */
    checkbox?: boolean;

    /** 
     * Track select dropdown changes. 
     * Captures selected option text on change.
     * @default true 
     */
    select?: boolean;
}

export interface ErrorReplayConfig {
    /** Maximum number of actions to store in buffer (default: 50) */
    maxActions?: number;

    /**
     * Additional CSS selectors or regex patterns to mark inputs as sensitive.
     * Sensitive input values are replaced with `[SANITIZED]` in error reports.
     * 
     * **Auto-sanitized by default:**
     * - Password inputs (`<input type="password">`)
     * - Phone inputs (`<input type="tel">`)
     * - Fields with autocomplete: `cc-number`, `cc-csc`, `new-password`, etc.
     * - Fields with name/id containing: password, secret, token, api-key, credit-card, cvv, ssn, pin
     * - Values matching credit card or SSN patterns
     * 
     * Use this option to add **additional** fields to sanitize.
     * 
     * @default []
     * 
     * @example
     * // Sanitize by CSS selector
     * sanitize: ['.sensitive-field', '#secret-input', '[data-private]']
     * 
     * @example
     * // Sanitize by name/id pattern (regex)
     * sanitize: ['account', 'balance', 'salary']
     * 
     * @example
     * // Mix of selectors and patterns
     * sanitize: ['.private-data', 'bank-account', '[data-sensitive="true"]']
     */
    sanitize?: string[];

    /** Callback when an error is captured */
    onError?: (report: ErrorReport) => void;

    /** Enable React component name detection (default: true) */
    captureComponents?: boolean;

    /** Enable click tracking (default: true) */
    trackClicks?: boolean;

    /**
     * Enable input tracking. Can be a boolean or an object for granular control.
     * 
     * @default true
     * 
     * @example
     * // Enable all input tracking (default)
     * trackInputs: true
     * 
     * @example
     * // Disable all input tracking
     * trackInputs: false
     * 
     * @example
     * // Granular control - only track text inputs
     * trackInputs: { text: true, checkbox: false, select: false }
     */
    trackInputs?: boolean | TrackInputsConfig;

    /** Enable navigation tracking (default: true) */
    trackNavigation?: boolean;

    /** Enable network tracking (default: true) */
    trackNetwork?: boolean;

    /** Enable console tracking (default: true) */
    trackConsole?: boolean;

    /** Custom user data to include in reports */
    user?: {
        id?: string;
        sessionId?: string;
        [key: string]: unknown;
    };
}

// ============================================
// Error Report
// ============================================

export interface ErrorInfo {
    message: string;
    type: string;
    stack?: string;
    componentStack?: string;
}

export interface ContextInfo {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    platform: string;
    timestamp: string;
}

export type ActionWithRelativeTime = UserAction & {
    relativeTime: string;
};

export interface ErrorReport {
    reportId: string;
    timestamp: string;
    error: ErrorInfo;
    context: ContextInfo;
    user?: {
        id?: string;
        sessionId?: string;
        [key: string]: unknown;
    };
    actions: ActionWithRelativeTime[];
}

// ============================================
// Internal Types
// ============================================

export interface DetectorCleanup {
    (): void;
}
