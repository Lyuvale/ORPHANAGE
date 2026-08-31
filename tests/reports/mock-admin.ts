import type { AdminClient as ReportsAdminClient } from "@/lib/reports/visits";

type Row = Record<string, unknown>;

export interface QueryRecord {
  table: string;
  eq: [string, unknown][];
  in: [string, unknown[]][];
  gte: [string, unknown][];
}

/**
 * A minimal supabase-style admin client mock for exercising report row
 * builders that query the database. Each `from(table)` call returns a
 * thenable query chain whose resolution yields the configured `data` for that
 * table and records the filters that were applied (so tests can assert that
 * builders scope queries to a specific centre).
 */
export function makeAdmin(tables: Record<string, Row[]>, opts: { errorTable?: string } = {}) {
  const calls: QueryRecord[] = [];

  const from = (table: string) => {
    const rec: QueryRecord = { table, eq: [], in: [], gte: [] };
    calls.push(rec);
    const fail = opts.errorTable && opts.errorTable === table;
    const resolve = () =>
      fail ? { data: null, error: new Error(`boom: ${table}`) } : { data: tables[table] ?? [], error: null };

    const p = new Promise<{ data: Row[] | null; error: Error | null }>((r) => r(resolve())) as any;
    p.select = () => p;
    p.eq = (col: string, val: unknown) => {
      rec.eq.push([col, val]);
      return p;
    };
    p.in = (col: string, vals: unknown[]) => {
      rec.in.push([col, vals]);
      return p;
    };
    p.gte = (col: string, val: unknown) => {
      rec.gte.push([col, val]);
      return p;
    };
    p.order = () => p;
    p.limit = () => p;
    return p;
  };

  const admin = ({ from } as unknown) as ReportsAdminClient;
  return { admin, calls };
}

/** Find the eq() centre_id value used for a given table, if any. */
export function centreFilter(calls: QueryRecord[], table: string): unknown {
  const rec = calls.find((c) => c.table === table);
  if (!rec) return undefined;
  const f = rec.eq.find(([col]) => col === "centre_id");
  return f ? f[1] : undefined;
}
