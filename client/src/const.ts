export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Get the login URL from the server.
 * The server generates a proper Google OAuth authorization URL with PKCE.
 * Falls back gracefully if auth not configured.
 */
export const getLoginUrl = (): string => {
  // Simple endpoint — server handles all OAuth URL generation
  return "/auth/login";
};
