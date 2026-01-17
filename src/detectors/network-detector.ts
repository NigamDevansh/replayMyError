/**
 * Network Detector
 * 
 * Intercepts fetch and XMLHttpRequest to track API calls.
 */

import { NetworkAction, DetectorCleanup } from '../types';

export interface NetworkDetectorOptions {
    onAction: (action: NetworkAction) => void;
}

/**
 * Create a network detector that tracks fetch and XHR requests
 */
export function createNetworkDetector(options: NetworkDetectorOptions): DetectorCleanup {
    const { onAction } = options;

    // Store original implementations
    const originalFetch = window.fetch.bind(window);
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    // Intercept fetch
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const startTime = Date.now();
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method || 'GET';

        try {
            const response = await originalFetch(input, init);

            const action: NetworkAction = {
                type: 'network',
                url: sanitizeUrl(url),
                method: method.toUpperCase(),
                status: response.status,
                duration: Date.now() - startTime,
                timestamp: Date.now(),
                page: window.location.pathname
            };

            onAction(action);
            return response;
        } catch (error) {
            const action: NetworkAction = {
                type: 'network',
                url: sanitizeUrl(url),
                method: method.toUpperCase(),
                error: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime,
                timestamp: Date.now(),
                page: window.location.pathname
            };

            onAction(action);
            throw error;
        }
    };

    // Intercept XMLHttpRequest
    const xhrData = new WeakMap<XMLHttpRequest, { url: string; method: string; startTime: number }>();

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
        xhrData.set(this, {
            url: typeof url === 'string' ? url : url.toString(),
            method: method.toUpperCase(),
            startTime: 0
        });
        return originalXHROpen.apply(this, [method, url, ...args] as any);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
        const data = xhrData.get(this);
        if (data) {
            data.startTime = Date.now();
        }

        this.addEventListener('loadend', () => {
            const data = xhrData.get(this);
            if (!data) return;

            const action: NetworkAction = {
                type: 'network',
                url: sanitizeUrl(data.url),
                method: data.method,
                status: this.status,
                duration: Date.now() - data.startTime,
                timestamp: Date.now(),
                page: window.location.pathname
            };

            onAction(action);
        });

        this.addEventListener('error', () => {
            const data = xhrData.get(this);
            if (!data) return;

            const action: NetworkAction = {
                type: 'network',
                url: sanitizeUrl(data.url),
                method: data.method,
                error: 'Network error',
                duration: Date.now() - data.startTime,
                timestamp: Date.now(),
                page: window.location.pathname
            };

            onAction(action);
        });

        return originalXHRSend.apply(this, [body]);
    };

    // Return cleanup function
    return () => {
        window.fetch = originalFetch;
        XMLHttpRequest.prototype.open = originalXHROpen;
        XMLHttpRequest.prototype.send = originalXHRSend;
    };
}

/**
 * Sanitize URL to remove sensitive query parameters
 */
function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url, window.location.origin);

        // List of sensitive parameter names to remove
        const sensitiveParams = [
            'token', 'api_key', 'apikey', 'key', 'secret',
            'password', 'passwd', 'auth', 'authorization',
            'access_token', 'refresh_token'
        ];

        for (const param of sensitiveParams) {
            if (parsed.searchParams.has(param)) {
                parsed.searchParams.set(param, '[REDACTED]');
            }
        }

        // Return path + sanitized query string
        return parsed.pathname + parsed.search;
    } catch {
        return url;
    }
}
