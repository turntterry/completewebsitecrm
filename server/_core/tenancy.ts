/**
 * Single-Tenant Helpers
 *
 * This app is intentionally single-tenant. The default company ID is 1.
 * All queries must filter by companyId for data isolation.
 */

import type { User } from "../../drizzle/schema";

/** The default/only company ID for this single-tenant app. */
export const DEFAULT_COMPANY_ID = 1;

/**
 * Get the active company ID for the current context.
 *
 * For authenticated users: returns user.companyId (should be DEFAULT_COMPANY_ID in single-tenant)
 * For public/unauthenticated: returns DEFAULT_COMPANY_ID
 *
 * This is the single source of truth for company identity.
 *
 * @param user - The authenticated user (can be null for public endpoints)
 * @returns The company ID for this operation
 */
export function getActiveCompanyId(user: User | null): number {
  // If user is authenticated, use their company ID
  if (user && user.companyId) {
    return user.companyId;
  }
  // Default to company 1 (public/unauthenticated context)
  return DEFAULT_COMPANY_ID;
}

/**
 * Assert that a given company ID matches the active company.
 * Useful for validating that a queried resource belongs to the active company.
 *
 * @param resourceCompanyId - The companyId from a database record
 * @param userCompanyId - The user's companyId (from getActiveCompanyId)
 * @returns true if IDs match, false otherwise
 */
export function validateCompanyAccess(
  resourceCompanyId: number | null | undefined,
  userCompanyId: number
): boolean {
  return resourceCompanyId === userCompanyId;
}
