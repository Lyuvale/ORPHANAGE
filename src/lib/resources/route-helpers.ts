/**
 * Shared helpers for the Resources & Support API routes.
 */

/**
 * Map a thrown error message to the appropriate HTTP status.
 * Follows the established app convention:
 *   - NOT_AUTHENTICATED     -> 401
 *   - PERMISSION_DENIED etc -> 403
 *   - V_ (validation)       -> 400
 *   - else                  -> 500
 */
export function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED") || message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) {
    return 403;
  }
  if (message.includes("V_")) return 400;
  return 500;
}

/** Verify a record belongs to the current centre; 404 otherwise. */
export function ensureOwnCentre(centreId: string | undefined, ctxCentreId: string): boolean {
  return !!centreId && centreId === ctxCentreId;
}
