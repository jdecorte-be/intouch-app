// Deployment-specific values. Each one can be overridden per build with an
// EXPO_PUBLIC_* variable (see .env.example); the defaults point at production.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.retalk.live';
export const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'https://retalk.app';
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@retalk.live';
