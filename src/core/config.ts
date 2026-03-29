/**
 * Configuration Defaults
 * 
 * Default values and resolved type for ErrorReplayConfig.
 */

import { ErrorReplayConfig } from '../types';

/**
 * The fully-resolved config type (all tracking flags are required,
 * but onError and user remain optional).
 */
export type ResolvedConfig = Required<Omit<ErrorReplayConfig, 'onError' | 'user'>> & Pick<ErrorReplayConfig, 'onError' | 'user'>;

/**
 * Default configuration — all tracking enabled, 50-action buffer.
 */
export const DEFAULT_CONFIG: Required<Omit<ErrorReplayConfig, 'onError' | 'user'>> = {
    maxActions: 50,
    sanitize: [],
    captureComponents: true,
    trackClicks: true,
    trackInputs: true,
    trackNavigation: true,
    trackNetwork: true,
    trackConsole: true
};
