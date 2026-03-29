/**
 * Action Type Definitions
 * 
 * Interfaces for every type of user action that ErrorReplay can capture.
 */

// ============================================
// Base
// ============================================

export interface BaseAction {
    type: string;
    timestamp: number;
    page: string;
}

// ============================================
// Specific Actions
// ============================================

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

// ============================================
// Union & Internal
// ============================================

export type UserAction = ClickAction | InputAction | NavigationAction | NetworkAction | ConsoleAction;

export interface DetectorCleanup {
    (): void;
}
