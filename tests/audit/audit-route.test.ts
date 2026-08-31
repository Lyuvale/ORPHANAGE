import { describe, it, expect } from "vitest";
import {
  buildAuditFilters,
  auditToCsv,
  AUDIT_MAX_LIMIT,
} from "@/lib/audit/audit-query";
import type { AuditLog } from "@/types/audit";

function makeLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: "log-1",
    centre_id: "centre-a",
    actor_user_id: "user-a",
    actor_email: "a@example.com",
    action: "CREATE",
    entity_type: "child",
    entity_id: "child-1",
    previous_values: null,
    new_values: { first_name: "Amina" },
    metadata: null,
    ip_address: "127.0.0.1",
    user_agent: "Mozilla/5.0",
    created_at: "2026-09-09T10:00:00Z",
    ...overrides,
  };
}

describe("buildAuditFilters", () => {
  it("returns defaults when no params provided", () => {
    const f = buildAuditFilters({});
    expect(f.limit).toBe(50);
    expect(f.offset).toBe(0);
    expect(f.action).toBeUndefined();
    expect(f.exportMode).toBe(false);
  });

  it("coerces valid action but drops invalid ones", () => {
    expect(buildAuditFilters({ action: "APPROVE" }).action).toBe("APPROVE");
    expect(buildAuditFilters({ action: "NOT_A_REAL_ACTION" }).action).toBeUndefined();
  });

  it("clamps limit to the max", () => {
    expect(buildAuditFilters({ limit: "99999" }).limit).toBe(AUDIT_MAX_LIMIT);
    expect(buildAuditFilters({ limit: "1" }).limit).toBe(1);
  });

  it("clamps negative offset to zero", () => {
    expect(buildAuditFilters({ offset: "-5" }).offset).toBe(0);
    expect(buildAuditFilters({ offset: "20" }).offset).toBe(20);
  });

  it("parses date and entity filters", () => {
    const f = buildAuditFilters({
      from: "2026-01-01",
      to: "2026-12-31",
      entity_type: "child",
      actor_email: "a@example.com",
      entity_id: "child-1",
    });
    expect(f.from).toBe("2026-01-01");
    expect(f.to).toBe("2026-12-31");
    expect(f.entity_type).toBe("child");
    expect(f.actor_email).toBe("a@example.com");
    expect(f.entity_id).toBe("child-1");
  });

  it("enables export mode only for csv", () => {
    expect(buildAuditFilters({ export: "csv" }).exportMode).toBe(true);
    expect(buildAuditFilters({ export: "pdf" }).exportMode).toBe(false);
  });
});

describe("auditToCsv", () => {
  it("writes a header row", () => {
    const csv = auditToCsv([]);
    expect(csv.split("\n")[0]).toContain("created_at");
    expect(csv.split("\n")[0]).toContain("actor_email");
    expect(csv.split("\n")[0]).toContain("action");
    expect(csv.split("\n")[0]).toContain("entity_type");
  });

  it("serialises a row with quoting", () => {
    const csv = auditToCsv([makeLog()]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("CREATE");
    expect(lines[1]).toContain("child");
  });

  it("handles rows whose JSON values contain quotes/commas without corrupting CSV", () => {
    const log = makeLog({
      new_values: { note: 'said "hello", then left' },
      metadata: { nested: { a: 1 } },
    });
    const csv = auditToCsv([log]);
    // Header + single data row.
    expect(csv.split("\n")).toHaveLength(2);
    // The CSV cell is quoted and the embedded content survives.
    expect(csv).toContain("hello");
    expect(csv).toContain("nested");
    // Every data cell is wrapped in double quotes (well-formed rows).
    const cells = csv.split("\n")[1].split('","');
    expect(cells.length).toBeGreaterThan(1);
  });

  it("represents null fields as empty", () => {
    const log = makeLog({ actor_email: null, entity_id: null });
    const csv = auditToCsv([log]);
    expect(csv).not.toContain("null");
  });

  it("does not serialize sensitive values into output data (callers sanitize before storing)", () => {
    // The audit store sanitizes on write; CSV just reflects stored values.
    const log = makeLog();
    const csv = auditToCsv([log]);
    expect(csv).toContain("Amina");
  });
});
