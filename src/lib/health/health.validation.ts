import { z } from "zod";
import {
  BLOOD_GROUPS,
  MEDICAL_RECORD_TYPES,
  MEDICAL_VISIT_TYPES,
  MEDICATION_STATUSES,
  MEDICATION_ADMIN_STATUSES,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  SCREENING_TYPES,
  IMMUNIZATION_STATUSES,
  HEALTH_DOCUMENT_TYPES,
  HEALTH_ALERT_TYPES,
  HEALTH_FOLLOWUP_TYPES,
  HEALTH_FOLLOWUP_STATUSES,
} from "@/types/health";

// ─── Shared field helpers ───────────────────────────────────

const optionalUuid = () =>
  z.string().uuid("Invalid ID").optional().or(z.literal("").transform(() => null)).nullable();

const optionalDateString = () =>
  z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable();

const dateString = () =>
  z
    .string()
    .min(1, "Date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date");

const optionalText = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} must be ${max} characters or fewer`)
    .trim()
    .optional()
    .or(z.literal("").transform(() => null))
    .or(z.null());

const requiredText = (max: number, label: string) =>
  z.string().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`).trim();

const jsonArray = (label: string) =>
  z
    .array(z.record(z.unknown()))
    .max(200, `${label} must have 200 or fewer entries`)
    .optional()
    .default([]);

// ─── Health Profile Schemas ─────────────────────────────────

export const createHealthProfileSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  blood_group: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: "Invalid blood group" }),
  }).optional().nullable(),
  allergies: jsonArray("Allergies"),
  medical_conditions: jsonArray("Medical conditions"),
  disability_support: jsonArray("Disability support"),
  general_health_notes: optionalText(5000, "General health notes"),
  emergency_health_info: optionalText(5000, "Emergency health info"),
  emergency_contacts: jsonArray("Emergency contacts"),
});

export const updateHealthProfileSchema = z
  .object({
    blood_group: z.enum(BLOOD_GROUPS, {
      errorMap: () => ({ message: "Invalid blood group" }),
    }).optional().nullable(),
    allergies: jsonArray("Allergies"),
    medical_conditions: jsonArray("Medical conditions"),
    disability_support: jsonArray("Disability support"),
    general_health_notes: optionalText(5000, "General health notes"),
    emergency_health_info: optionalText(5000, "Emergency health info"),
    emergency_contacts: jsonArray("Emergency contacts"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Medical Record Schemas ─────────────────────────────────

export const createMedicalRecordSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  record_date: dateString(),
  record_type: z.enum(MEDICAL_RECORD_TYPES, {
    errorMap: () => ({ message: "Invalid record type" }),
  }),
  provider_name: optionalText(200, "Provider name"),
  provider_role: optionalText(200, "Provider role"),
  reason: optionalText(2000, "Reason"),
  findings: optionalText(10000, "Findings"),
  treatment: optionalText(10000, "Treatment"),
  followup_required: z.boolean().optional(),
  followup_date: optionalDateString(),
  outcome: optionalText(2000, "Outcome"),
});

export const amendMedicalRecordSchema = z
  .object({
    findings: optionalText(10000, "Findings"),
    treatment: optionalText(10000, "Treatment"),
    outcome: optionalText(2000, "Outcome"),
    followup_required: z.boolean().optional(),
    followup_date: optionalDateString(),
    amendment_reason: requiredText(500, "Amendment reason"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Medical Visit Schemas ──────────────────────────────────

export const createMedicalVisitSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  visit_date: dateString(),
  visit_type: z.enum(MEDICAL_VISIT_TYPES, {
    errorMap: () => ({ message: "Invalid visit type" }),
  }),
  provider_name: optionalText(200, "Provider name"),
  provider_role: optionalText(200, "Provider role"),
  reason: optionalText(2000, "Reason"),
  outcome: optionalText(2000, "Outcome"),
  followup_required: z.boolean().optional(),
  followup_date: optionalDateString(),
  notes: optionalText(5000, "Notes"),
});

// ─── Medication Schemas ─────────────────────────────────────

export const createMedicationSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  medication_name: requiredText(200, "Medication name"),
  dosage: optionalText(200, "Dosage"),
  frequency: optionalText(200, "Frequency"),
  route: optionalText(200, "Route"),
  start_date: dateString(),
  end_date: optionalDateString(),
  prescribed_by: optionalText(200, "Prescribed by"),
  reason: optionalText(2000, "Reason"),
  status: z.enum(MEDICATION_STATUSES, {
    errorMap: () => ({ message: "Invalid medication status" }),
  }).optional(),
  notes: optionalText(2000, "Notes"),
});

export const updateMedicationSchema = z
  .object({
    dosage: optionalText(200, "Dosage"),
    frequency: optionalText(200, "Frequency"),
    route: optionalText(200, "Route"),
    end_date: optionalDateString(),
    status: z.enum(MEDICATION_STATUSES, {
      errorMap: () => ({ message: "Invalid medication status" }),
    }).optional(),
    notes: optionalText(2000, "Notes"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const medicationStatusSchema = z.object({
  status: z.enum(MEDICATION_STATUSES, {
    errorMap: () => ({ message: "Invalid medication status" }),
  }),
});

// ─── Medication Administration Schemas ──────────────────────

export const createMedicationAdministrationSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  medication_id: z.string().uuid("Invalid medication ID"),
  scheduled_time: dateString(),
  status: z.enum(MEDICATION_ADMIN_STATUSES, {
    errorMap: () => ({ message: "Invalid administration status" }),
  }).optional(),
  not_administered_reason: optionalText(2000, "Reason"),
  notes: optionalText(2000, "Notes"),
});

// ─── Appointment Schemas ────────────────────────────────────

export const createAppointmentSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  appointment_type: z.enum(APPOINTMENT_TYPES, {
    errorMap: () => ({ message: "Invalid appointment type" }),
  }),
  provider_name: optionalText(200, "Provider name"),
  appointment_date: dateString(),
  appointment_time: z.string().optional().nullable(),
  location: optionalText(200, "Location"),
  purpose: optionalText(2000, "Purpose"),
  followup_required: z.boolean().optional(),
  followup_date: optionalDateString(),
  notes: optionalText(5000, "Notes"),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES, {
    errorMap: () => ({ message: "Invalid appointment status" }),
  }),
  reason: optionalText(500, "Reason"),
});

// ─── Screening Schemas ──────────────────────────────────────

export const createScreeningSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  screening_type: z.enum(SCREENING_TYPES, {
    errorMap: () => ({ message: "Invalid screening type" }),
  }),
  screening_date: dateString(),
  provider_name: optionalText(200, "Provider name"),
  measurements: z.record(z.unknown()).optional().nullable(),
  result: optionalText(5000, "Result"),
  outcome: optionalText(2000, "Outcome"),
  followup_required: z.boolean().optional(),
  followup_date: optionalDateString(),
  notes: optionalText(5000, "Notes"),
});

// ─── Immunization Schemas ───────────────────────────────────

export const createImmunizationSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  vaccine: requiredText(200, "Vaccine"),
  dose: optionalText(200, "Dose"),
  administered_date: dateString(),
  provider_name: optionalText(200, "Provider name"),
  next_dose_date: optionalDateString(),
  status: z.enum(IMMUNIZATION_STATUSES, {
    errorMap: () => ({ message: "Invalid immunization status" }),
  }).optional(),
  notes: optionalText(2000, "Notes"),
});

// ─── Health Document Schemas ────────────────────────────────

export const createHealthDocumentSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  document_type: z.enum(HEALTH_DOCUMENT_TYPES, {
    errorMap: () => ({ message: "Invalid document type" }),
  }),
  file_name: requiredText(255, "File name"),
  file_type: optionalText(100, "File type"),
  file_size: z.number().int().nonnegative().optional().nullable(),
  storage_path: requiredText(2000, "Storage path"),
  description: optionalText(2000, "Description"),
});

// ─── Health Alert Schemas ───────────────────────────────────

export const createHealthAlertSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  alert_type: z.enum(HEALTH_ALERT_TYPES, {
    errorMap: () => ({ message: "Invalid alert type" }),
  }),
  title: requiredText(200, "Title"),
  description: optionalText(2000, "Description"),
  severity: z.string().max(50).optional(),
  visible_to_caregiver: z.boolean().optional(),
  source_record_id: optionalUuid(),
});

export const updateHealthAlertSchema = z
  .object({
    is_active: z.boolean().optional(),
    severity: z.string().max(50).optional(),
    description: optionalText(2000, "Description"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Health Follow-Up Schemas ───────────────────────────────

export const createHealthFollowupSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  followup_type: z.enum(HEALTH_FOLLOWUP_TYPES, {
    errorMap: () => ({ message: "Invalid follow-up type" }),
  }),
  source_record_id: optionalUuid(),
  title: requiredText(200, "Title"),
  description: optionalText(5000, "Description"),
  responsible_user_id: optionalUuid(),
  due_date: dateString(),
});

export const updateHealthFollowupSchema = z
  .object({
    status: z.enum(HEALTH_FOLLOWUP_STATUSES, {
      errorMap: () => ({ message: "Invalid follow-up status" }),
    }).optional(),
    outcome: optionalText(2000, "Outcome"),
    due_date: optionalDateString(),
    responsible_user_id: optionalUuid(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Search Schemas ─────────────────────────────────────────

const baseSearchShape = {
  child_id: z.string().uuid().optional().or(z.literal("")),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "50", 10);
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 200);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "0", 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
};

export const healthSearchSchema = z.object({
  ...baseSearchShape,
});

export const medicalRecordSearchSchema = z.object({
  ...baseSearchShape,
  record_type: z.enum(MEDICAL_RECORD_TYPES).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const appointmentSearchSchema = z.object({
  ...baseSearchShape,
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const medicationSearchSchema = z.object({
  ...baseSearchShape,
  status: z.enum(MEDICATION_STATUSES).optional(),
});

export const medicationAdminSearchSchema = z.object({
  ...baseSearchShape,
  medication_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(MEDICATION_ADMIN_STATUSES).optional(),
});

export const screeningSearchSchema = z.object({
  ...baseSearchShape,
  screening_type: z.enum(SCREENING_TYPES).optional(),
});

export const immunizationSearchSchema = z.object({
  ...baseSearchShape,
  status: z.enum(IMMUNIZATION_STATUSES).optional(),
});

export const documentSearchSchema = z.object({
  ...baseSearchShape,
  document_type: z.enum(HEALTH_DOCUMENT_TYPES).optional(),
});

export const alertSearchSchema = z.object({
  ...baseSearchShape,
  is_active: z
    .string()
    .optional()
    .transform((val) => (val === undefined || val === "" ? undefined : val === "true")),
  visible_to_caregiver: z
    .string()
    .optional()
    .transform((val) => (val === undefined || val === "" ? undefined : val === "true")),
});

export const followupSearchSchema = z.object({
  ...baseSearchShape,
  status: z.enum(HEALTH_FOLLOWUP_STATUSES).optional(),
  followup_type: z.enum(HEALTH_FOLLOWUP_TYPES).optional(),
});

// ─── Input Cleaning ─────────────────────────────────────────

export function cleanHealthInput<T extends Record<string, unknown>>(input: T): T {
  const cleaned = { ...input };
  for (const [key, value] of Object.entries(cleaned)) {
    if (value === "") {
      cleaned[key as keyof T] = null as T[keyof T];
    }
  }
  return cleaned;
}
