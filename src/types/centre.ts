export type CentreStatus = "pending" | "active" | "suspended" | "deactivated";

export interface Centre {
  id: string;
  name: string;
  code: string;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  status: CentreStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateCentreInput {
  name: string;
  code: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  status?: CentreStatus;
}

export interface UpdateCentreInput {
  name?: string;
  code?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  status?: CentreStatus;
}

export const CENTRE_STATUSES = ["pending", "active", "suspended", "deactivated"] as const;

export const CENTRE_DEFAULT_COUNTRY = "Nigeria";
