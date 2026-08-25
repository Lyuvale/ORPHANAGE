/**
 * Tenant Context
 *
 * This module provides the architecture for deriving the active centre (tenant)
 * from the authenticated user's session context.
 *
 * SECURITY MODEL:
 * - The centre_id MUST come from the server-side session/JWT, never from client requests.
 * - The application layer must ensure that the JWT contains the correct 'centre_id' claim.
 * - Clients must NEVER be allowed to supply centre_id directly.
 *
 * CURRENT STATE:
 * - Auth system is not yet implemented.
 * - This module provides the interface and helpers.
 * - When auth is added, the JWT centre_id extraction will be wired up.
 *
 * FUTURE:
 * - user_centres junction table will map users to one or more centres.
 * - A user can switch active centre (multi-centre access).
 * - The active centre_id is stored in the JWT.
 */

export interface TenantContext {
  centreId: string;
}

/**
 * Extract the tenant context from an authenticated user's session.
 *
 * SECURITY: This function must ONLY be called server-side after verifying
 * the user's authentication. The centreId is derived from the JWT, never
 * from client input.
 *
 * @throws {Error} If no valid tenant context is available.
 */
export async function getTenantContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any,
): Promise<TenantContext> {
  if (!session?.user) {
    throw new Error("Authentication required: no active session.");
  }

  const claims = session.user.app_metadata ?? session.user.user_metadata ?? {};
  const centreId = claims.centre_id as string | undefined;

  if (!centreId) {
    throw new Error(
      "No tenant context: user has no centre association. " +
        "Ensure the user's JWT contains a 'centre_id' claim.",
    );
  }

  return { centreId };
}

/**
 * Validate that a given centre_id matches the current tenant context.
 *
 * Use this to guard any operation that receives a centre_id parameter,
 * ensuring it matches the authenticated user's tenant.
 *
 * @throws {Error} If the provided centreId does not match the tenant context.
 */
export function validateTenantAccess(
  tenantContext: TenantContext,
  requestedCentreId: string,
): void {
  if (tenantContext.centreId !== requestedCentreId) {
    throw new Error(
      "Access denied: requested centre does not match your tenant context.",
    );
  }
}
