import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SupportSource,
  CreateSupportSourceInput,
  UpdateSupportSourceInput,
  SupportFund,
  CreateSupportFundInput,
  UpdateSupportFundInput,
  SupportExpense,
  CreateSupportExpenseInput,
  UpdateSupportExpenseInput,
  SupportBenefit,
  CreateSupportBenefitInput,
  UpdateSupportBenefitInput,
  SupportDocument,
  CreateSupportDocumentInput,
  SupportChildRef,
  SupportSourceDetail,
  SupportFundDetail,
  SupportExpenseDetail,
  SupportBenefitDetail,
  SupportOverview,
} from "@/types/resources";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── Shared: children lookup ─────────────────────────────────
// Resolve existing child records by id so the relationship always
// references the real child (never duplicated). Only returns children
// belonging to the given centre (tenant isolation).

async function getChildrenForCentre(
  admin: AdminClient,
  centreId: string,
  childIds: string[],
): Promise<SupportChildRef[]> {
  const unique = Array.from(new Set(childIds));
  if (unique.length === 0) return [];
  const { data, error } = await admin
    .from("children")
    .select("id, reference_number, first_name, last_name")
    .in("id", unique)
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load children: ${error.message}`);
  return (data ?? []) as SupportChildRef[];
}

// ─── Sources ─────────────────────────────────────────────────

export async function listSources(
  admin: AdminClient,
  centreId: string,
  type?: string,
): Promise<{ data: SupportSource[]; count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("support_sources")
    .select("*", { count: "exact" })
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (type && type !== "ALL") q = q.eq("source_type", type);

  const { data, error, count } = await q;
  if (error) throw new Error(`Failed to list sources: ${error.message}`);
  return { data: (data ?? []) as SupportSource[], count: count ?? 0 };
}

export async function getSourceById(admin: AdminClient, id: string): Promise<SupportSource | null> {
  const { data, error } = await admin
    .from("support_sources")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get source: ${error.message}`);
  }
  return data as SupportSource;
}

export async function createSource(
  admin: AdminClient,
  input: CreateSupportSourceInput,
  userId: string,
): Promise<SupportSource> {
  const { data, error } = await admin
    .from("support_sources")
    .insert({
      centre_id: input.centre_id,
      source_type: input.source_type,
      source_name: input.source_name,
      amount: input.amount,
      source_date: input.source_date ?? null,
      purpose: input.purpose ?? null,
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23503") throw new Error("Referenced centre does not exist.");
    throw new Error(`Failed to create source: ${error.message}`);
  }
  return data as SupportSource;
}

export async function updateSource(
  admin: AdminClient,
  id: string,
  input: UpdateSupportSourceInput,
): Promise<SupportSource> {
  const payload: Record<string, unknown> = {};
  if (input.source_type !== undefined) payload.source_type = input.source_type;
  if (input.source_name != null) payload.source_name = input.source_name;
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.source_date !== undefined) payload.source_date = input.source_date;
  if (input.purpose !== undefined) payload.purpose = input.purpose;
  if (input.notes !== undefined) payload.notes = input.notes;

  const { data, error } = await admin
    .from("support_sources")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.message.includes("V_")) throw new Error(error.message);
    throw new Error(`Failed to update source: ${error.message}`);
  }
  return data as SupportSource;
}

// ─── Funds ───────────────────────────────────────────────────

export async function listFunds(
  admin: AdminClient,
  centreId: string,
  sourceId?: string,
): Promise<{ data: SupportFundDetail[]; count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("support_funds")
    .select("*", { count: "exact" })
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (sourceId) q = q.eq("source_id", sourceId);

  const { data, error, count } = await q;
  if (error) throw new Error(`Failed to list funds: ${error.message}`);

  const out: SupportFundDetail[] = [];
  for (const fund of (data ?? []) as SupportFund[]) {
    const detail = await getFundDetail(admin, fund.id, centreId);
    if (detail) out.push(detail);
  }
  return { data: out, count: count ?? 0 };
}

export async function getFundById(admin: AdminClient, id: string): Promise<SupportFund | null> {
  const { data, error } = await admin.from("support_funds").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get fund: ${error.message}`);
  }
  return data as SupportFund;
}

export async function createFund(
  admin: AdminClient,
  input: CreateSupportFundInput,
  userId: string,
): Promise<SupportFund> {
  const { data, error } = await admin
    .from("support_funds")
    .insert({
      centre_id: input.centre_id,
      source_id: input.source_id,
      fund_name: input.fund_name,
      amount_allocated: input.amount_allocated,
      purpose: input.purpose ?? null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) {
    const msg = error.message;
    if (msg.includes("V_")) throw new Error(msg);
    if (error.code === "23503") throw new Error("Referenced source or centre does not exist.");
    throw new Error(`Failed to create fund: ${error.message}`);
  }
  return data as SupportFund;
}

export async function updateFund(
  admin: AdminClient,
  id: string,
  input: UpdateSupportFundInput,
): Promise<SupportFund> {
  const payload: Record<string, unknown> = {};
  if (input.source_id !== undefined) payload.source_id = input.source_id;
  if (input.fund_name != null) payload.fund_name = input.fund_name;
  if (input.amount_allocated !== undefined) payload.amount_allocated = input.amount_allocated;
  if (input.purpose !== undefined) payload.purpose = input.purpose;

  const { data, error } = await admin
    .from("support_funds")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    const msg = error.message;
    if (msg.includes("V_")) throw new Error(msg);
    throw new Error(`Failed to update fund: ${error.message}`);
  }
  return data as SupportFund;
}

// ─── Expenses ────────────────────────────────────────────────

export async function listExpenses(
  admin: AdminClient,
  centreId: string,
  fundId?: string,
  status?: string,
): Promise<{ data: SupportExpenseDetail[]; count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("support_expenses")
    .select("*", { count: "exact" })
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (fundId) q = q.eq("fund_id", fundId);
  if (status) q = q.eq("approval_status", status);

  const { data, error, count } = await q;
  if (error) throw new Error(`Failed to list expenses: ${error.message}`);

  const out: SupportExpenseDetail[] = [];
  for (const exp of (data ?? []) as SupportExpense[]) {
    const detail = await getExpenseDetail(admin, exp.id, centreId);
    if (detail) out.push(detail);
  }
  return { data: out, count: count ?? 0 };
}

export async function getExpenseById(admin: AdminClient, id: string): Promise<SupportExpense | null> {
  const { data, error } = await admin.from("support_expenses").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get expense: ${error.message}`);
  }
  return data as SupportExpense;
}

export async function createExpense(
  admin: AdminClient,
  input: CreateSupportExpenseInput,
  userId: string,
): Promise<SupportExpense> {
  const { data, error } = await admin
    .from("support_expenses")
    .insert({
      centre_id: input.centre_id,
      fund_id: input.fund_id,
      description: input.description,
      amount: input.amount,
      expense_date: input.expense_date ?? null,
      approval_status: input.approval_status ?? "PENDING",
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) {
    const msg = error.message;
    if (msg.includes("V_")) throw new Error(msg);
    if (error.code === "23503") throw new Error("Referenced fund or centre does not exist.");
    throw new Error(`Failed to create expense: ${error.message}`);
  }
  return data as SupportExpense;
}

export async function updateExpense(
  admin: AdminClient,
  id: string,
  input: UpdateSupportExpenseInput,
): Promise<SupportExpense> {
  const payload: Record<string, unknown> = {};
  if (input.description != null) payload.description = input.description;
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.expense_date !== undefined) payload.expense_date = input.expense_date;
  if (input.notes !== undefined) payload.notes = input.notes;

  const { data, error } = await admin
    .from("support_expenses")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    const msg = error.message;
    if (msg.includes("V_")) throw new Error(msg);
    throw new Error(`Failed to update expense: ${error.message}`);
  }
  return data as SupportExpense;
}

/** Set an expense's approval status (approve/reject/pending). */
export async function setExpenseApproval(
  admin: AdminClient,
  id: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
  approvedBy: string,
): Promise<SupportExpense> {
  const payload: Record<string, unknown> = {
    approval_status: status,
  };
  if (status === "APPROVED") {
    payload.approved_by = approvedBy;
    payload.approved_at = new Date().toISOString();
  } else {
    payload.approved_by = null;
    payload.approved_at = null;
  }

  const { data, error } = await admin
    .from("support_expenses")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    const msg = error.message;
    if (msg.includes("V_")) throw new Error(msg);
    throw new Error(`Failed to update approval status: ${error.message}`);
  }
  return data as SupportExpense;
}

// ─── Benefits ────────────────────────────────────────────────

export async function listBenefits(
  admin: AdminClient,
  centreId: string,
  expenseId?: string,
): Promise<{ data: SupportBenefitDetail[]; count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("support_benefits")
    .select("*", { count: "exact" })
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (expenseId) q = q.eq("expense_id", expenseId);

  const { data, error, count } = await q;
  if (error) throw new Error(`Failed to list benefits: ${error.message}`);

  const out: SupportBenefitDetail[] = [];
  for (const benefit of (data ?? []) as SupportBenefit[]) {
    const detail = await getBenefitDetail(admin, benefit.id, centreId);
    if (detail) out.push(detail);
  }
  return { data: out, count: count ?? 0 };
}

export async function getBenefitById(admin: AdminClient, id: string): Promise<SupportBenefit | null> {
  const { data, error } = await admin.from("support_benefits").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get benefit: ${error.message}`);
  }
  return data as SupportBenefit;
}

export async function createBenefit(
  admin: AdminClient,
  input: CreateSupportBenefitInput,
  userId: string,
): Promise<SupportBenefit> {
  const { data, error } = await admin
    .from("support_benefits")
    .insert({
      centre_id: input.centre_id,
      expense_id: input.expense_id,
      benefit_type: input.benefit_type,
      description: input.description ?? null,
      benefit_date: input.benefit_date ?? null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23503") throw new Error("Referenced expense or centre does not exist.");
    throw new Error(`Failed to create benefit: ${error.message}`);
  }
  return data as SupportBenefit;
}

export async function updateBenefit(
  admin: AdminClient,
  id: string,
  input: UpdateSupportBenefitInput,
): Promise<SupportBenefit> {
  const payload: Record<string, unknown> = {};
  if (input.benefit_type !== undefined) payload.benefit_type = input.benefit_type;
  if (input.description !== undefined) payload.description = input.description;
  if (input.benefit_date !== undefined) payload.benefit_date = input.benefit_date;

  const { data, error } = await admin
    .from("support_benefits")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update benefit: ${error.message}`);
  return data as SupportBenefit;
}

// ─── Benefit -> Children ─────────────────────────────────────

export async function getBenefitChildren(
  admin: AdminClient,
  benefitId: string,
  centreId: string,
): Promise<SupportChildRef[]> {
  const { data, error } = await admin
    .from("support_benefit_children")
    .select("child_id")
    .eq("benefit_id", benefitId)
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load benefit children: ${error.message}`);
  const ids = (data ?? []).map((r: { child_id: string }) => r.child_id);
  return getChildrenForCentre(admin, centreId, ids);
}

/** Replace the set of children linked to a benefit (existing child ids only). */
export async function setBenefitChildren(
  admin: AdminClient,
  benefitId: string,
  centreId: string,
  childIds: string[],
  userId: string,
): Promise<void> {
  const unique = Array.from(new Set(childIds));

  // Verify all referenced children exist in this centre (tenant isolation + re-use).
  const children = await getChildrenForCentre(admin, centreId, unique);
  if (children.length !== unique.length) {
    throw new Error("V_INVALID: One or more selected children are not valid for this centre.");
  }

  // Replace the linkage.
  await admin
    .from("support_benefit_children")
    .delete()
    .eq("benefit_id", benefitId)
    .eq("centre_id", centreId);

  if (unique.length > 0) {
    const rows = unique.map((childId) => ({
      centre_id: centreId,
      benefit_id: benefitId,
      child_id: childId,
      created_by: userId,
    }));
    const { error } = await admin.from("support_benefit_children").insert(rows);
    if (error) throw new Error(`Failed to link children: ${error.message}`);
  }
}

export async function listChildBenefits(
  admin: AdminClient,
  childId: string,
  centreId: string,
): Promise<SupportBenefitDetail[]> {
  const { data, error } = await admin
    .from("support_benefit_children")
    .select("benefit_id")
    .eq("child_id", childId)
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load child benefits: ${error.message}`);

  const benefitIds = (data ?? []).map((r: { benefit_id: string }) => r.benefit_id);
  if (benefitIds.length === 0) return [];
  return getBenefitDetailsByIds(admin, benefitIds, centreId);
}

// ─── Detail / relationship builders ──────────────────────────

export async function getSourceDetail(
  admin: AdminClient,
  id: string,
  centreId: string,
): Promise<SupportSourceDetail | null> {
  const source = await getSourceById(admin, id);
  if (!source || source.centre_id !== centreId) return null;

  const { data: funds, error: fErr } = await admin
    .from("support_funds")
    .select("*")
    .eq("source_id", id)
    .eq("centre_id", centreId);
  if (fErr) throw new Error(`Failed to load source funds: ${fErr.message}`);

  const fundDetails: SupportFundDetail[] = [];
  let allocated = 0;
  let used = 0;

  for (const fund of (funds ?? []) as SupportFund[]) {
    const detail = await getFundDetail(admin, fund.id, centreId);
    if (detail) {
      fundDetails.push(detail);
      allocated += detail.amount_allocated;
      used += detail.used;
    }
  }

  const remaining = source.amount - allocated;

  return { ...source, allocated, used, remaining, funds: fundDetails };
}

export async function getFundDetail(
  admin: AdminClient,
  id: string,
  centreId: string,
): Promise<SupportFundDetail | null> {
  const fund = await getFundById(admin, id);
  if (!fund || fund.centre_id !== centreId) return null;

  // Parent source (FLOW: expense -> fund -> source).
  const source = fund.source_id ? await getSourceById(admin, fund.source_id) : null;
  if (source && source.centre_id !== centreId) {
    throw new Error("V_INVALID: Fund source does not belong to this centre.");
  }

  // Approved usage only counts toward balances.
  const { data: expenses, error: eErr } = await admin
    .from("support_expenses")
    .select("*")
    .eq("fund_id", id)
    .eq("centre_id", centreId);
  if (eErr) throw new Error(`Failed to load fund expenses: ${eErr.message}`);

  let used = 0;
  const expenseDetails: SupportExpenseDetail[] = [];
  for (const exp of (expenses ?? []) as SupportExpense[]) {
    if (exp.approval_status === "APPROVED") used += Number(exp.amount) || 0;
    const detail = await getExpenseDetail(admin, exp.id, centreId, fund);
    if (detail) expenseDetails.push(detail);
  }

  return {
    ...fund,
    amount_allocated: Number(fund.amount_allocated) || 0,
    source,
    used,
    balance: (Number(fund.amount_allocated) || 0) - used,
    expenses: expenseDetails,
  };
}

export async function getExpenseDetail(
  admin: AdminClient,
  id: string,
  centreId: string,
  fund?: SupportFund | null,
): Promise<SupportExpenseDetail | null> {
  const expense = await getExpenseById(admin, id);
  if (!expense || expense.centre_id !== centreId) return null;

  let fundRow: SupportFundDetail | null = null;
  if (fund) fundRow = await getFundDetail(admin, fund.id, centreId);
  else if (expense.fund_id) fundRow = await getFundDetail(admin, expense.fund_id, centreId);

  const { data: benefits, error: bErr } = await admin
    .from("support_benefits")
    .select("*")
    .eq("expense_id", id)
    .eq("centre_id", centreId);
  if (bErr) throw new Error(`Failed to load expense benefits: ${bErr.message}`);

  const benefitDetails: SupportBenefitDetail[] = [];
  for (const ben of (benefits ?? []) as SupportBenefit[]) {
    const detail = await getBenefitDetail(admin, ben.id, centreId);
    if (detail) benefitDetails.push(detail);
  }

  return { ...expense, fund: fundRow, benefits: benefitDetails };
}

export async function getBenefitDetail(
  admin: AdminClient,
  id: string,
  centreId: string,
): Promise<SupportBenefitDetail | null> {
  const benefit = await getBenefitById(admin, id);
  if (!benefit || benefit.centre_id !== centreId) return null;

  const expense = benefit.expense_id ? await getExpenseDetail(admin, benefit.expense_id, centreId) : null;
  const children = await getBenefitChildren(admin, id, centreId);

  return { ...benefit, expense, children };
}

async function getBenefitDetailsByIds(
  admin: AdminClient,
  ids: string[],
  centreId: string,
): Promise<SupportBenefitDetail[]> {
  const out: SupportBenefitDetail[] = [];
  for (const id of ids) {
    const detail = await getBenefitDetail(admin, id, centreId);
    if (detail) out.push(detail);
  }
  // Keep consistent ordering.
  return out.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
}

// ─── Overview ────────────────────────────────────────────────

export async function getOverview(admin: AdminClient, centreId: string): Promise<SupportOverview> {
  const sources = await listSources(admin, centreId);
  const funds = await listFunds(admin, centreId);
  const expenses = await listExpenses(admin, centreId);
  const benefits = await listBenefits(admin, centreId);

  let total_received = 0;
  const by_source_type: SupportOverview["by_source_type"] = [];
  for (const s of sources.data) {
    total_received += Number(s.amount) || 0;
    const existing = by_source_type.find((e) => e.source_type === s.source_type);
    if (existing) {
      existing.count += 1;
      existing.amount += Number(s.amount) || 0;
    } else {
      by_source_type.push({ source_type: s.source_type, count: 1, amount: Number(s.amount) || 0 });
    }
  }

  let total_allocated = 0;
  for (const f of funds.data) total_allocated += Number(f.amount_allocated) || 0;

  let total_used = 0;
  for (const e of expenses.data) {
    if (e.approval_status === "APPROVED") total_used += Number(e.amount) || 0;
  }

  // Count unique benefited children.
  const { data: benefitChildren, error: bcErr } = await admin
    .from("support_benefit_children")
    .select("child_id")
    .eq("centre_id", centreId);
  if (bcErr) throw new Error(`Failed to load benefit children: ${bcErr.message}`);
  const total_children_benefited = new Set((benefitChildren ?? []).map((r: { child_id: string }) => r.child_id)).size;

  const by_benefit_type: SupportOverview["by_benefit_type"] = [];
  for (const b of benefits.data) {
    const existing = by_benefit_type.find((e) => e.benefit_type === b.benefit_type);
    if (existing) existing.count += 1;
    else by_benefit_type.push({ benefit_type: b.benefit_type, count: 1 });
  }

  // Recent funds and expenses (with balances) for the home overview.
  const recent_funds: SupportFundDetail[] = [];
  for (const f of funds.data.slice(0, 5)) {
    const detail = await getFundDetail(admin, f.id, centreId);
    if (detail) recent_funds.push(detail);
  }
  const recent_expenses: SupportExpenseDetail[] = [];
  for (const e of expenses.data.slice(0, 5)) {
    const detail = await getExpenseDetail(admin, e.id, centreId);
    if (detail) recent_expenses.push(detail);
  }

  return {
    total_sources: sources.count,
    total_funds: funds.count,
    total_expenses: expenses.count,
    total_benefits: benefits.count,
    total_received,
    total_allocated,
    total_used,
    total_children_benefited,
    by_source_type,
    by_benefit_type,
    recent_funds,
    recent_expenses,
  };
}

// ─── Documents ───────────────────────────────────────────────
// Reuses the existing private-document pattern (owner row + private bucket).

export async function listDocuments(
  admin: AdminClient,
  entityType: string,
  entityId: string,
  centreId: string,
): Promise<SupportDocument[]> {
  const { data, error } = await admin
    .from("support_documents")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("centre_id", centreId)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Failed to list documents: ${error.message}`);
  return (data ?? []) as SupportDocument[];
}

export async function createDocumentRecord(
  admin: AdminClient,
  input: CreateSupportDocumentInput,
  userId: string,
): Promise<SupportDocument> {
  const { data, error } = await admin
    .from("support_documents")
    .insert({
      centre_id: input.centre_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      file_name: input.file_name,
      file_type: input.file_type,
      file_size: input.file_size,
      storage_path: input.storage_path,
      description: input.description ?? null,
      uploaded_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to save document record: ${error.message}`);
  return data as SupportDocument;
}

export async function getDocumentById(
  admin: AdminClient,
  id: string,
  centreId: string,
): Promise<SupportDocument | null> {
  const { data, error } = await admin
    .from("support_documents")
    .select("*")
    .eq("id", id)
    .eq("centre_id", centreId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get document: ${error.message}`);
  }
  return data as SupportDocument;
}

export async function listEntitiesForReport(
  admin: AdminClient,
  centreId: string,
): Promise<SupportSourceDetail[]> {
  const sources = await listSources(admin, centreId);
  const out: SupportSourceDetail[] = [];
  for (const s of sources.data) {
    const detail = await getSourceDetail(admin, s.id, centreId);
    if (detail) out.push(detail);
  }
  return out;
}
