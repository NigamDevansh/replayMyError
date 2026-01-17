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
    inputType: 'input' | 'change' | 'focus' | 'blur';
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

export interface ErrorReplayConfig {
    /** Maximum number of actions to store in buffer (default: 50) */
    maxActions?: number;

    /** Additional CSS selectors or patterns to sanitize */
    sanitize?: string[];

    /** Callback when an error is captured */
    onError?: (report: ErrorReport) => void;

    /** Enable React component name detection (default: true) */
    captureComponents?: boolean;

    /** Enable click tracking (default: true) */
    trackClicks?: boolean;

    /** Enable input tracking (default: true) */
    trackInputs?: boolean;

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
