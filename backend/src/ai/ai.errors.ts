/**
 * AI-layer specific errors. These are internal signals used by the AI analysis
 * workflow — they must never leak raw provider details to customers.
 */

/** Transport/provider level failure: timeout, HTTP error, malformed payload. */
export class AiProviderError extends Error {}

/** The model responded, but the output failed schema or domain validation. */
export class AiValidationError extends Error {}
