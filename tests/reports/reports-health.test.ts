import { describe, it, expect } from "vitest";
import {
  medicalRecordsRows,
  appointmentsRows,
  immunizationsRows,
} from "@/lib/reports/health";
import { makeAdmin, centreFilter } from "./mock-admin";

const CENTRE = "centre-1";

describe("Health report row builders", () => {
  it("builds medical record rows scoped to the centre, without narratives", async () => {
    const { admin, calls } = makeAdmin({
      children: [{ id: "c1", first_name: "Jane", last_name: "Doe", reference_number: "CH-1" }],
      health_medical_records: [
        {
          child_id: "c1",
          record_date: "2026-01-10",
          record_type: "consultation",
          provider_name: "Dr X",
          reason: "checkup",
          followup_required: true,
          version: 1,
          findings: "very sensitive clinical notes",
        },
      ],
    });
    const rows = await medicalRecordsRows(admin as never, CENTRE);
    expect(centreFilter(calls, "health_medical_records")).toBe(CENTRE);
    expect(rows[0].child).toBe("Jane Doe (CH-1)");
    expect(rows[0].record_type).toBe("Consultation");
    expect(rows[0].followup_required).toBe("Yes");
    // sensitive findings / outcome text never exported
    expect(Object.keys(rows[0])).not.toContain("findings");
  });

  it("builds appointment rows with display labels", async () => {
    const { admin } = makeAdmin({
      children: [{ id: "c1", first_name: "Jane", last_name: "Doe", reference_number: "CH-1" }],
      health_appointments: [
        {
          child_id: "c1",
          appointment_date: "2026-02-01",
          appointment_time: "09:00",
          appointment_type: "dental",
          provider_name: "Dr Y",
          location: "Room 1",
          status: "SCHEDULED",
        },
      ],
    });
    const rows = await appointmentsRows(admin as never, CENTRE);
    expect(rows[0].type).toBe("Dental");
    expect(rows[0].status).toBe("Scheduled");
  });

  it("builds immunization rows with display labels", async () => {
    const { admin } = makeAdmin({
      children: [{ id: "c1", first_name: "Jane", last_name: "Doe", reference_number: "CH-1" }],
      health_immunizations: [
        {
          child_id: "c1",
          vaccine: "BCG",
          dose: "1",
          administered_date: "2025-01-01",
          next_dose_date: null,
          provider_name: "Nurse",
          status: "COMPLETED",
        },
      ],
    });
    const rows = await immunizationsRows(admin as never, CENTRE);
    expect(rows[0].vaccine).toBe("BCG");
    expect(rows[0].administered_date).toBe("2025-01-01");
    expect(rows[0].status).toBe("Completed");
  });
});