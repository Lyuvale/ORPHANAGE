import { z } from "zod";
import { NOTIFICATION_EVENTS } from "@/types/notifications";

/**
 * Set a user's notification preference for an optional event type.
 * Customers may only opt out of OPTIONAL events; critical events
 * (safeguarding/security/financial accountability) are enforced server-side
 * regardless of preferences.
 */
export const setPreferenceSchema = z.object({
  event_type: z.enum(NOTIFICATION_EVENTS),
  enabled: z.boolean(),
});

export type SetPreferenceInput = z.infer<typeof setPreferenceSchema>;
