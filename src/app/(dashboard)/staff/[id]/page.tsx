"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  STAFF_STATUSES,
  STAFF_HISTORY_EVENTS,
  STAFF_DOCUMENT_TYPES,
  getStaffStatusDisplay,
  getStaffHistoryEventDisplay,
  getStaffTrainingStatusDisplay,
  getStaffVerificationStatusDisplay,
  getStaffDocumentTypeDisplay,
} from "@/types/staff";
import { CENTRE_ROLES } from "@/types/role";

interface StaffProfile {
  id: string;
  staff_identifier: string | null;
  job_title: string;
  department: string | null;
  operational_role: string | null;
  employment_status: string;
  start_date: string | null;
  end_date: string | null;
  work_phone: string | null;
  work_email: string | null;
  notes: string | null;
  created_at: string;
}

interface HistoryEntry {
  id: string;
  event_type: string;
  description: string | null;
  changed_by: string;
  created_at: string;
}

interface Assignment {
  id: string;
  responsibility_type: string;
  description: string | null;
  assigned_date: string | null;
  status: string;
}

interface Training {
  id: string;
  training_title: string;
  provider: string | null;
  training_date: string | null;
  due_date: string | null;
  completion_status: string;
  certificate_reference: string | null;
  expiry_date: string | null;
  notes: string | null;
}

interface Qualification {
  id: string;
  qualification: string;
  institution: string | null;
  qualification_year: string | null;
  verification_status: string;
  notes: string | null;
}

interface EmergencyContact {
  id: string;
  contact_name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    ON_LEAVE: "bg-amber-100 text-amber-800",
    SUSPENDED: "bg-orange-100 text-orange-800",
    INACTIVE: "bg-zinc-100 text-gray-800",
    ENDED: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-zinc-100 text-gray-800"}`}
    >
      {getStaffStatusDisplay(status as (typeof STAFF_STATUSES)[number])}
    </span>
  );
}

const inputCls =
  "mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6";

async function handleFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  return json;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-4 sm:px-6">
        <h2 className="text-lg font-medium text-zinc-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </div>
  );
}

export default function StaffProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [training, setTraining] = useState<Training[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [emergency, setEmergency] = useState<EmergencyContact[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [editError, setEditError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const results = await Promise.allSettled([
      handleFetch(`/api/staff/${id}`),
      handleFetch(`/api/staff/${id}/history`),
      handleFetch(`/api/staff/${id}/assignments`),
      handleFetch(`/api/staff/${id}/training`),
      handleFetch(`/api/staff/${id}/qualifications`),
      handleFetch(`/api/staff/${id}/emergency`),
      handleFetch(`/api/staff/${id}/documents`),
    ]);

    const [p, h, a, t, q, e, d] = results;

    if (p.status === "fulfilled") {
      setProfile(p.value.data);
      if (h.status === "fulfilled") setHistory(h.value.data ?? []);
      if (a.status === "fulfilled") setAssignments(a.value.data ?? []);
      if (t.status === "fulfilled") setTraining(t.value.data ?? []);
      if (q.status === "fulfilled") setQualifications(q.value.data ?? []);
      if (e.status === "fulfilled") setEmergency(e.value.data ?? []);
      if (d.status === "fulfilled") setDocuments(d.value.data ?? []);
    } else {
      setLoadError(p.reason instanceof Error ? p.reason.message : "Failed to load staff profile");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function updateProfile(formData: FormData) {
    setBusy(true);
    setEditError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        if (value !== "") payload[key] = value;
      }
      const res = await handleFetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setProfile(res.data);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(formData: FormData) {
    setBusy(true);
    setStatusError(null);
    try {
      const res = await handleFetch(`/api/staff/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: formData.get("status") }),
      });
      setProfile(res.data);
      await reload();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Status change failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitSection(url: string, formData: FormData) {
    setSectionError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        if (value !== "") payload[key] = value;
      }
      await handleFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await reload();
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function endAssignment(assignmentId: string) {
    setSectionError(null);
    try {
      await handleFetch(`/api/staff/${id}/assignments/${assignmentId}/end`, {
        method: "POST",
      });
      await reload();
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Failed to end assignment");
    }
  }

  async function markTrainingComplete(trainingId: string) {
    setSectionError(null);
    try {
      await handleFetch(`/api/staff/${id}/training/${trainingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_status: "COMPLETED" }),
      });
      await reload();
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Failed to update training");
    }
  }

  async function uploadDocument(formData: FormData) {
    setSectionError(null);
    try {
      await handleFetch(`/api/staff/${id}/documents`, {
        method: "POST",
        body: formData,
      });
      await reload();
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function downloadDocument(docId: string) {
    setSectionError(null);
    try {
      const res = await handleFetch(`/api/staff/${id}/documents/${docId}/download`, {
        method: "POST",
      });
      window.open(res.data.signedUrl, "_blank");
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Download failed");
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-zinc-500">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-600">{loadError ?? "Staff profile not found."}</p>
        <Link href="/team" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Back to Team
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/team" className="text-sm font-semibold text-zinc-900 hover:text-indigo-600">
          &larr; Back to Team
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{profile.job_title}</h1>
            <StatusBadge status={profile.employment_status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500 font-mono">
            {profile.staff_identifier || profile.id}
          </p>
          {profile.department && (
            <p className="mt-1 text-sm text-zinc-600">Department / Unit: {profile.department}</p>
          )}
        </div>
      </div>

      {(sectionError || editError || statusError) && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{sectionError || editError || statusError}</p>
        </div>
      )}

      {/* Employment details + status */}
      <Section title="Employment Details" subtitle="Update work information or change employment status">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile(new FormData(e.currentTarget));
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="job_title" className="block text-sm font-medium text-zinc-900">Job Title</label>
              <input type="text" name="job_title" id="job_title" defaultValue={profile.job_title} maxLength={200} className={inputCls} />
            </div>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-zinc-900">Department / Unit</label>
              <input type="text" name="department" id="department" defaultValue={profile.department ?? ""} maxLength={200} className={inputCls} />
            </div>
            <div>
              <label htmlFor="operational_role" className="block text-sm font-medium text-zinc-900">Operational Role</label>
              <select name="operational_role" id="operational_role" defaultValue={profile.operational_role ?? ""} className={inputCls}>
                <option value="">No role</option>
                {CENTRE_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="work_phone" className="block text-sm font-medium text-zinc-900">Work Phone</label>
              <input type="text" name="work_phone" id="work_phone" defaultValue={profile.work_phone ?? ""} maxLength={50} className={inputCls} />
            </div>
            <div>
              <label htmlFor="work_email" className="block text-sm font-medium text-zinc-900">Work Email</label>
              <input type="email" name="work_email" id="work_email" defaultValue={profile.work_email ?? ""} maxLength={200} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-zinc-900">Start Date</label>
                <input type="date" name="start_date" id="start_date" defaultValue={profile.start_date ?? ""} className={inputCls} />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-zinc-900">End Date</label>
                <input type="date" name="end_date" id="end_date" defaultValue={profile.end_date ?? ""} className={inputCls} />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">Notes</label>
              <textarea name="notes" id="notes" rows={2} defaultValue={profile.notes ?? ""} maxLength={2000} className={inputCls} />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 disabled:opacity-50"
            >
              Save Details
            </button>
          </div>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            changeStatus(new FormData(e.currentTarget));
          }}
          className="mt-6 border-t border-zinc-200 pt-6"
        >
          <h3 className="text-sm font-semibold text-zinc-900">Change Employment Status</h3>
          <div className="mt-3 flex items-end gap-3">
            <div className="w-full max-w-xs">
              <select name="status" defaultValue={profile.employment_status} className={inputCls} disabled={profile.employment_status === "ENDED"}>
                {STAFF_STATUSES.map((s) => (
                  <option key={s} value={s} disabled={s === profile.employment_status}>
                    {getStaffStatusDisplay(s)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={busy || profile.employment_status === "ENDED"}
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-zinc-50 disabled:opacity-50"
            >
              Update Status
            </button>
          </div>
        </form>
      </Section>

      {/* Assignments */}
      <Section title="Responsibilities & Assignments" subtitle="Track assigned duties such as house-parent or care duty">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSection(`/api/staff/${id}/assignments`, new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
          className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <div>
            <input type="text" name="responsibility_type" required placeholder="e.g. House Parent" maxLength={200} className={inputCls} />
          </div>
          <div>
            <input type="text" name="description" placeholder="Description" maxLength={2000} className={inputCls} />
          </div>
          <div className="flex gap-3">
            <input type="date" name="assigned_date" className={inputCls} />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </form>

        {assignments.length === 0 ? (
          <p className="text-sm text-zinc-500">No assignments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900">{a.responsibility_type}</div>
                  {a.description && <div className="text-sm text-zinc-500">{a.description}</div>}
                  {a.assigned_date && (
                    <div className="text-xs text-zinc-400">From {new Date(a.assigned_date).toLocaleDateString()}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={a.status === "ACTIVE" ? "ACTIVE" : "ENDED"} />
                  {a.status === "ACTIVE" && (
                    <button
                      onClick={() => endAssignment(a.id)}
                      disabled={busy}
                      className="text-sm font-semibold text-red-600 hover:text-red-500 disabled:opacity-50"
                    >
                      End
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Training */}
      <Section title="Training & Certifications" subtitle="Record training, due dates and completion status">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSection(`/api/staff/${id}/training`, new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
          className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <div>
            <input type="text" name="training_title" required placeholder="e.g. First Aid" maxLength={300} className={inputCls} />
          </div>
          <div>
            <input type="text" name="provider" placeholder="Provider" maxLength={200} className={inputCls} />
          </div>
          <div className="flex gap-3">
            <input type="date" name="training_date" className={inputCls} />
            <input type="date" name="due_date" placeholder="Due" className={inputCls} />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 disabled:opacity-50"
            >
              Add Training
            </button>
          </div>
        </form>

        {training.length === 0 ? (
          <p className="text-sm text-zinc-500">No training records yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {training.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900">{t.training_title}</div>
                  <div className="text-xs text-zinc-500">
                    {t.provider && `${t.provider} · `}
                    {t.training_date && `Trained ${new Date(t.training_date).toLocaleDateString()} · `}
                    {getStaffTrainingStatusDisplay(t.completion_status as "PENDING" | "COMPLETED")}
                  </div>
                </div>
                {t.completion_status === "PENDING" && (
                  <button
                    onClick={() => markTrainingComplete(t.id)}
                    disabled={busy}
                    className="text-sm font-semibold text-green-600 hover:text-green-500 disabled:opacity-50"
                  >
                    Mark Complete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Qualifications */}
      <Section title="Qualifications" subtitle="Academic and professional qualifications">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSection(`/api/staff/${id}/qualifications`, new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
          className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <div>
            <input type="text" name="qualification" required placeholder="e.g. Certificate in Childcare" maxLength={300} className={inputCls} />
          </div>
          <div>
            <input type="text" name="institution" placeholder="Institution" maxLength={300} className={inputCls} />
          </div>
          <div className="flex gap-3">
            <input type="number" name="qualification_year" placeholder="Year" min={1900} max={2100} className={inputCls} />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>

        {qualifications.length === 0 ? (
          <p className="text-sm text-zinc-500">No qualifications recorded yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {qualifications.map((q) => (
              <li key={q.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900">{q.qualification}</div>
                  <div className="text-xs text-zinc-500">
                    {q.institution && `${q.institution} · `}
                    {q.qualification_year && `${q.qualification_year} · `}
                    {getStaffVerificationStatusDisplay(q.verification_status as "VERIFIED" | "PENDING" | "NOT_VERIFIED")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Emergency contacts */}
      <Section title="Emergency Contacts" subtitle="Restricted — people to reach in an emergency">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSection(`/api/staff/${id}/emergency`, new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
          className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <div>
            <input type="text" name="contact_name" required placeholder="Contact name" maxLength={200} className={inputCls} />
          </div>
          <div>
            <input type="text" name="relationship" placeholder="Relationship" maxLength={100} className={inputCls} />
          </div>
          <div className="flex gap-3">
            <input type="tel" name="phone" placeholder="Phone" maxLength={50} className={inputCls} />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>

        {emergency.length === 0 ? (
          <p className="text-sm text-zinc-500">No emergency contacts recorded.</p>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {emergency.map((c) => (
              <li key={c.id} className="py-3">
                <div className="text-sm font-medium text-zinc-900">
                  {c.contact_name}
                  {c.relationship && <span className="font-normal text-zinc-500"> · {c.relationship}</span>}
                </div>
                <div className="text-xs text-zinc-500">
                  {c.phone && `📞 ${c.phone}`}
                  {c.phone && c.email && " · "}
                  {c.email && `✉️ ${c.email}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Documents */}
      <Section title="Documents" subtitle="Certificates, agreements and identification stored privately">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const file = formData.get("file");
            if (!file || (file as File).size === 0) {
              setSectionError("Please choose a file to upload");
              return;
            }
            uploadDocument(formData);
            e.currentTarget.reset();
          }}
          className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <div>
            <select name="document_type" required defaultValue="" className={inputCls}>
              <option value="" disabled>Document type</option>
              {STAFF_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>{getStaffDocumentTypeDisplay(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <input type="file" name="file" required className={inputCls} />
          </div>
          <div className="flex gap-3">
            <input type="text" name="description" placeholder="Description" maxLength={2000} className={inputCls} />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 disabled:opacity-50"
            >
              Upload
            </button>
          </div>
        </form>

        {documents.length === 0 ? (
          <p className="text-sm text-zinc-500">No documents uploaded.</p>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between py-3">
                <div>
                  <button
                    onClick={() => downloadDocument(doc.id)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {doc.file_name}
                  </button>
                  <div className="text-xs text-zinc-500">
                    {getStaffDocumentTypeDisplay(doc.document_type as (typeof STAFF_DOCUMENT_TYPES)[number])}
                    {doc.file_size && ` · ${(doc.file_size / 1024).toFixed(1)} KB`}
                  </div>
                </div>
                <div className="text-xs text-zinc-400">
                  {new Date(doc.uploaded_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* History */}
      <Section title="History" subtitle="Preserved record of role, status and assignment changes">
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">No history recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className="border-l-2 border-indigo-200 pl-4">
                <div className="text-sm font-medium text-zinc-900">
                  {getStaffHistoryEventDisplay(entry.event_type as (typeof STAFF_HISTORY_EVENTS)[number])}
                </div>
                {entry.description && <div className="text-sm text-zinc-500">{entry.description}</div>}
                <div className="text-xs text-zinc-400">
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}