/**
 * Configuration Defaults
 * 
 * Default values and resolved type for ErrorReplayConfig.
 */

import { ErrorReplayConfig } from '../types';

/**
 * The fully-resolved config type (all tracking flags are required,
 * but onError and slack remain optional. user is required).
 */
export type ResolvedConfig = Required<Omit<ErrorReplayConfig, 'onError' | 'slack'>> & Pick<ErrorReplayConfig, 'onError' | 'slack'>;

/**
 * Default configuration — all tracking enabled, 50-action buffer.
 * user and slack configurations are not defaulted here.
 */
export const DEFAULT_CONFIG: Required<Omit<ErrorReplayConfig, 'onError' | 'user' | 'slack'>> = {
    maxActions: 50,
    sanitize: [],
    captureComponents: true,
    trackClicks: true,
    trackInputs: true,
    trackNavigation: true,
    trackNetwork: true,
    trackConsole: true
};
