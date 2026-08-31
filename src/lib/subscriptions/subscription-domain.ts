/**
 * Subscription domain errors.
 *
 * Domain logic for subscription access. These errors flow up to API routes
 * which map them to HTTP status codes (403 for access/validation denials).
 */

export class SubscriptionStatusError extends Error {
  constructor(
    message: string,
    public readonly code: string = "SUBSCRIPTION_STATUS",
    public readonly status: string | null = null,
  ) {
    super(`[${code}] ${message}`);
    this.name = "SubscriptionStatusError";
  }
}

export class AccessError extends Error {
  constructor(
    message: string,
    public readonly code: string = "ACCESS_DENIED",
  ) {
    super(`[${code}] ${message}`);
    this.name = "AccessError";
  }
}

/** Feature not enabled by the centre's current plan. */
export class PlanFeatureError extends Error {
  constructor(
    message: string,
    public readonly feature: string,
  ) {
    super(`[FEATURE_NOT_INCLUDED] ${message}`);
    this.name = "PlanFeatureError";
  }
}
