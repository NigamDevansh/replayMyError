/**
 * Configuration Type Definitions
 * 
 * Interfaces for ErrorReplay configuration options.
 */

import type { ErrorReport } from './report';

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

    /** Custom user data to include in reports. REQUIRED. */
    user: UserConfig;

    /** Slack integration options (optional, server-side only) */
    slack?: SlackConfig;
}

export interface UserConfig {
    /** Unique user identifier. REQUIRED — default Slack thread grouping key. */
    id: string;
    /** Display name */
    name?: string;
    /** Email address */
    email?: string;
    /** Session identifier */
    sessionId?: string;
    /** Arbitrary additional metadata — use 'metadata.<key>' in groupByField */
    metadata?: Record<string, unknown>;
}

export interface SlackConfig {
    /** Slack Bot Token (xoxb-...). Read from process.env in your config file. */
    token: string;

    /**
     * Channel(s) to post reports to.
     * Accepts channel IDs (C0123456789) or channel names (#error-replay).
     * Names are auto-resolved to IDs on first use via conversations.list.
     * @default ['#error-replay']
     */
    channels?: string[];

    /**
     * Field from user object to group Slack threads by.
     * 
     * Supports top-level fields and metadata sub-fields:
     * - Top-level: 'id', 'name', 'email', 'sessionId'
     * - Metadata: 'metadata.team', 'metadata.region', etc.
     * 
     * Reports with the same value are posted as thread replies under one parent.
     * Falls back to 'id' if the specified field is not found.
     * @default 'id'
     */
    groupByField?: string;

    /**
     * Toggle Slack on/off without removing config.
     * @default true
     */
    enabled?: boolean;
}

/** Helper to provide type autocomplete when defining ErrorReplay configuration */
export function defineConfig(config: ErrorReplayConfig): ErrorReplayConfig {
    return config;
}
