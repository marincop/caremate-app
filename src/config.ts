// CareMate AI - runtime configuration

/**
 * Base URL of the CareMate AI backend.
 * Empty string = backend not configured yet, so taskParser falls back to LOCAL_MOCK.
 * Example: "https://api.caremate.example.com"
 */
export const BACKEND_URL: string = "https://caremate-api.trucop.com";

/** Request timeout for the parse-tasks endpoint (ms). */
export const PARSE_TIMEOUT_MS = 8000;

export const APP_NAME = "CareMate AI";

/** Supported UI languages. */
export const LANGS = ["zh-Hant", "id", "vi"] as const;
