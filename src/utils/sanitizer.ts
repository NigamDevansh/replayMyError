/**
 * Sanitizer Utility
 * 
 * Handles detection and sanitization of sensitive data like passwords,
 * credit cards, SSNs, etc.
 */

// Default patterns for sensitive inputs
const SENSITIVE_INPUT_TYPES = [
    'password',
    'tel',
    'cc-number',
    'cc-csc',
    'cc-exp'
];

const SENSITIVE_AUTOCOMPLETE_VALUES = [
    'cc-number',
    'cc-csc',
    'cc-exp',
    'cc-exp-month',
    'cc-exp-year',
    'cc-type',
    'new-password',
    'current-password'
];

const SENSITIVE_NAME_PATTERNS = [
    /password/i,
    /passwd/i,
    /secret/i,
    /token/i,
    /api[_-]?key/i,
    /credit[_-]?card/i,
    /card[_-]?number/i,
    /cvv/i,
    /cvc/i,
    /csc/i,
    /ssn/i,
    /social[_-]?security/i,
    /pin/i
];

// Regex patterns for sensitive data in values
const CREDIT_CARD_PATTERN = /\b(?:\d[ -]*?){13,16}\b/;
const SSN_PATTERN = /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/;

/**
 * Check if an input element should be sanitized
 */
export function shouldSanitize(
    element: HTMLInputElement | HTMLTextAreaElement,
    customPatterns: string[] = []
): boolean {
    // Check input type
    if (element instanceof HTMLInputElement) {
        if (SENSITIVE_INPUT_TYPES.includes(element.type)) {
            return true;
        }
    }

    // Check autocomplete attribute
    const autocomplete = element.getAttribute('autocomplete');
    if (autocomplete && SENSITIVE_AUTOCOMPLETE_VALUES.includes(autocomplete)) {
        return true;
    }

    // Check name attribute
    const name = element.name || element.id || '';
    for (const pattern of SENSITIVE_NAME_PATTERNS) {
        if (pattern.test(name)) {
            return true;
        }
    }

    // Check custom CSS selectors/patterns
    for (const selector of customPatterns) {
        try {
            // If it's a CSS selector, try matching
            if (selector.startsWith('.') || selector.startsWith('#') || selector.startsWith('[')) {
                if (element.matches(selector)) {
                    return true;
                }
            }
            // If it's a string pattern, check name/id/class
            else {
                const regex = new RegExp(selector, 'i');
                if (regex.test(name) || regex.test(element.className)) {
                    return true;
                }
            }
        } catch {
            // Invalid selector, skip
        }
    }

    return false;
}

/**
 * Check if a value contains sensitive data patterns
 */
export function containsSensitiveData(value: string): boolean {
    if (!value) return false;

    // Check for credit card patterns
    if (CREDIT_CARD_PATTERN.test(value)) {
        return true;
    }

    // Check for SSN patterns
    if (SSN_PATTERN.test(value)) {
        return true;
    }

    return false;
}

/**
 * Sanitize a value by replacing it with a placeholder
 */
export function sanitizeValue(value: string, isSensitive: boolean): string {
    if (isSensitive) {
        return '[SANITIZED]';
    }

    // Even if not marked as sensitive, check for patterns
    if (containsSensitiveData(value)) {
        return '[SANITIZED]';
    }

    return value;
}

/**
 * Get a safe representation of an input value
 */
export function getSafeInputValue(
    element: HTMLInputElement | HTMLTextAreaElement,
    customPatterns: string[] = []
): { value: string; isSanitized: boolean } {
    const value = element.value;
    const isSensitive = shouldSanitize(element, customPatterns);

    if (isSensitive || containsSensitiveData(value)) {
        return {
            value: '[SANITIZED]',
            isSanitized: true
        };
    }

    // For non-sensitive inputs, we can include a preview
    // but still limit length for privacy
    const preview = value.length > 50 ? value.slice(0, 50) + '...' : value;
    return {
        value: preview,
        isSanitized: false
    };
}
