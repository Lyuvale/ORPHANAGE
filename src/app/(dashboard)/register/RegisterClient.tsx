"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Caps = {
  referral: boolean;
  child: boolean;
  guardian: boolean;
  link: boolean;
  admission: boolean;
  placement: boolean;
};

type StepKey = "link" | "referral" | "child" | "guardian" | "admission" | "placement";

const STEP_TITLES: Record<StepKey, string> = {
  link: "Admission",
  referral: "Referral",
  child: "Child",
  guardian: "Guardian",
  admission: "Admission",
  placement: "Placement",
};

const REFERRAL_SOURCES = [
  "police",
  "court",
  "hospital",
  "school",
  "community",
  "government",
  "self_referral",
  "other",
];

const REFERRAL_PRIORITIES = ["low", "medium", "high", "urgent"];

const GENDERS = ["male", "female", "other", "undisclosed"];

const RELATIONSHIP_TYPES = [
  "mother",
  "father",
  "grandparent",
  "sibling",
  "aunt",
  "uncle",
  "legal_guardian",
  "foster_caregiver",
  "other_relative",
  "other_authorised",
];

const PLACEMENT_TYPES = ["residential", "foster", "adoption", "transitional", "temporary"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function label(text: string, required = false) {
  return (
    <span className="block text-sm font-medium text-gray-700 mb-1">
      {text} {required && <span className="text-red-500">*</span>}
    </span>
  );
}

function inputClass() {
  return "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
}

async function postJson(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = json.details
      ? `: ${Object.entries(json.details)
          .map(([k, v]) => `${k} (${Array.isArray(v) ? v.join(", ") : v})`)
          .join("; ")}`
      : "";
    throw new Error(`${json.error ?? "Request failed"}${details}`);
  }
  return json.data as { id: string };
}

export default function RegisterClient({
  centreId,
  centreName,
  caps,
}: {
  centreId: string;
  centreName: string;
  caps: Caps;
}) {
  // Steps follow the intake chain; admission needs the referral created just
  // before it, so it is only offered together with the referral step.
  // Registrars without referral rights (Records Officer registers AFTER
  // approval) start by picking the approved admission to register from.
  const steps = useMemo<StepKey[]>(() => {
    const s: StepKey[] = [];
    if (caps.child && !caps.referral) s.push("link");
    if (caps.referral) s.push("referral");
    if (caps.child) s.push("child");
    if (caps.guardian) s.push("guardian");
    if (caps.admission && caps.referral) s.push("admission");
    if (caps.placement && caps.child) s.push("placement");
    return s;
  }, [caps]);

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [created, setCreated] = useState<{ label: string; href: string }[]>([]);

  // ── Admission linkage (records registers from an approved admission) ──
  const [linkAdmissionId, setLinkAdmissionId] = useState("");
  const [approvedAdmissions, setApprovedAdmissions] = useState<
    { id: string; reference_number: string; decision: string | null; referral_id: string }[]
  >([]);
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    if (steps[stepIndex] !== "link") return;
    setLinkLoading(true);
    fetch("/api/admissions?status=approved&limit=50", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => setApprovedAdmissions(j.data ?? []))
      .catch(() => setApprovedAdmissions([]))
      .finally(() => setLinkLoading(false));
  }, [steps, stepIndex]);

  async function pickAdmission(id: string) {
    setLinkAdmissionId(id);
    if (!id) return;
    const picked = approvedAdmissions.find((a) => a.id === id);
    if (!picked) return;
    try {
      const res = await fetch(`/api/referrals/${picked.referral_id}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const ref = json.data;
      if (!ref) return;
      // Prefill the child step from the referral (still editable).
      setFirstName(ref.child_first_name ?? "");
      setMiddleName(ref.child_middle_name ?? "");
      setLastName(ref.child_last_name ?? "");
      if (ref.child_date_of_birth) setDob(ref.child_date_of_birth.slice(0, 10));
      if (ref.child_gender) setGender(ref.child_gender);
      if (ref.child_nationality) setNationality(ref.child_nationality);
    } catch {
      /* keep manual entry */
    }
  }

  // ── Referral ──
  const [refSource, setRefSource] = useState("community");
  const [refPriority, setRefPriority] = useState("medium");
  const [refReason, setRefReason] = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [referrerContact, setReferrerContact] = useState("");
  // Fallback child names when the child step itself is not permitted.
  const [refChildFirst, setRefChildFirst] = useState("");
  const [refChildLast, setRefChildLast] = useState("");

  // ── Child ──
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("female");
  const [nationality, setNationality] = useState("Tanzanian");
  const [admissionDate, setAdmissionDate] = useState(todayIso());

  // ── Guardian ──
  const [gFirst, setGFirst] = useState("");
  const [gMiddle, setGMiddle] = useState("");
  const [gLast, setGLast] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [relationship, setRelationship] = useState("mother");
  const [isPrimary, setIsPrimary] = useState(true);

  // ── Admission ──
  const [admDecision, setAdmDecision] = useState("");
  const [admConditions, setAdmConditions] = useState("");
  const [admittedDate, setAdmittedDate] = useState(todayIso());

  // ── Placement ──
  const [placementType, setPlacementType] = useState("residential");
  const [placementStart, setPlacementStart] = useState(todayIso());
  const [bedRef, setBedRef] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [placementNotes, setPlacementNotes] = useState("");

  const step = steps[stepIndex];

  function validateStep(key: StepKey): string | null {
    if (key === "referral") {
      if (!refReason.trim()) return "Please describe the reason for referral.";
      if (!caps.child && (!refChildFirst.trim() || !refChildLast.trim()))
        return "Please enter the child's first and last name.";
    }
    if (key === "child") {
      if (!firstName.trim() || !lastName.trim()) return "Child first and last name are required.";
      if (!dob) return "Date of birth is required.";
      if (new Date(dob) >= new Date()) return "Date of birth must be in the past.";
      if (!admissionDate) return "Admission date is required.";
    }
    if (key === "guardian") {
      if (!gFirst.trim() || !gLast.trim()) return "Guardian first and last name are required.";
    }
    if (key === "placement") {
      if (!placementStart) return "Placement start date is required.";
    }
    return null;
  }

  function next() {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  async function submitAll() {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setWarning(null);
    setSaving(true);
    const done: { label: string; href: string }[] = [];
    try {
      const childFirst = caps.child ? firstName.trim() : refChildFirst.trim();
      const childLast = caps.child ? lastName.trim() : refChildLast.trim();

      let referralId: string | null = null;
      if (caps.referral) {
        setProgress("Creating referral…");
        const referral = await postJson("/api/referrals", {
          centre_id: centreId,
          source: refSource,
          priority: refPriority,
          reason: refReason.trim(),
          referrer_name: referrerName.trim() || undefined,
          referrer_contact: referrerContact.trim() || undefined,
          child_first_name: childFirst,
          child_last_name: childLast,
          child_middle_name: caps.child && middleName.trim() ? middleName.trim() : undefined,
          child_date_of_birth: caps.child && dob ? dob : undefined,
          child_gender: caps.child ? gender : undefined,
          child_nationality: caps.child && nationality.trim() ? nationality.trim() : undefined,
        });
        referralId = referral.id;
        done.push({ label: "Referral", href: `/referrals/${referral.id}` });
      }

      let childId: string | null = null;
      if (caps.child) {
        setProgress("Creating child record…");
        const child = await postJson("/api/children", {
          centre_id: centreId,
          first_name: firstName.trim(),
          middle_name: middleName.trim() || undefined,
          last_name: lastName.trim(),
          preferred_name: preferredName.trim() || undefined,
          date_of_birth: dob,
          gender,
          nationality: nationality.trim() || undefined,
          admission_date: admissionDate,
        });
        childId = child.id;
        done.push({
          label: `Child: ${firstName.trim()} ${lastName.trim()}`,
          href: `/children/${child.id}`,
        });
      }

      if (caps.guardian) {
        setProgress("Creating guardian…");
        const guardian = await postJson("/api/guardians", {
          centre_id: centreId,
          first_name: gFirst.trim(),
          middle_name: gMiddle.trim() || undefined,
          last_name: gLast.trim(),
          phone: gPhone.trim() || undefined,
          email: gEmail.trim() || undefined,
        });
        done.push({
          label: `Guardian: ${gFirst.trim()} ${gLast.trim()}`,
          href: `/guardians/${guardian.id}`,
        });

        if (childId) {
          if (caps.link) {
            setProgress("Linking guardian to child…");
            await postJson("/api/guardians/relationships", {
              centre_id: centreId,
              child_id: childId,
              guardian_id: guardian.id,
              relationship_type: relationship,
              is_primary: isPrimary,
            });
          } else {
            setWarning(
              "Guardian was saved but not linked to the child: your role cannot manage guardian relationships. Ask a centre manager or social worker to link them.",
            );
          }
        }
      }

      let admissionId: string | null = null;
      if (caps.admission && referralId) {
        setProgress("Creating admission…");
        const admission = await postJson("/api/admissions", {
          centre_id: centreId,
          referral_id: referralId,
          decision: admDecision.trim() || undefined,
          conditions: admConditions.trim() || undefined,
          admitted_date: admittedDate || undefined,
        });
        admissionId = admission.id;
        done.push({ label: "Admission", href: `/admissions/${admission.id}` });
      } else if (linkAdmissionId) {
        // Records registers from the picked approved admission.
        admissionId = linkAdmissionId;
        done.push({ label: "Admission", href: `/admissions/${linkAdmissionId}` });
      }

      if (caps.placement && childId) {
        setProgress("Creating placement…");
        const placement = await postJson("/api/placements", {
          centre_id: centreId,
          child_id: childId,
          admission_id: admissionId ?? undefined,
          placement_type: placementType,
          start_date: placementStart,
          bed_reference: bedRef.trim() || undefined,
          room_number: roomNo.trim() || undefined,
          notes: placementNotes.trim() || undefined,
        });
        done.push({ label: "Placement", href: `/placements/${placement.id}` });
      }

      if (linkAdmissionId && childId) {
        setProgress("Linking admission to the child…");
        await postJson(`/api/admissions/${linkAdmissionId}/link`, {
          child_id: childId,
        });
      }

      setCreated(done);
      setProgress(null);
    } catch (e) {
      setCreated(done);
      setError(
        e instanceof Error
          ? `${e.message}${done.length > 0 ? " (earlier records above were already saved)" : ""}`
          : "Registration failed.",
      );
      setProgress(null);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setCreated([]);
    setError(null);
    setWarning(null);
    setStepIndex(0);
  }

  // ── Success summary ──
  if (created.length > 0 && !saving && !error) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration complete</h1>
        <p className="text-sm text-gray-500 mb-6">
          {centreName} — the following records were created and linked.
        </p>
        {warning && (
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}
        <div className="bg-white rounded-lg border divide-y">
          {created.map((c) => (
            <div key={c.href} className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-900">
                <span className="text-green-600 mr-2">✓</span>
                {c.label}
              </span>
              <Link href={c.href} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                Open
              </Link>
            </div>
          ))}
        </div>
        <button
          onClick={reset}
          className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Register another child
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">New Registration</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        {centreName} — referral, child, guardian, admission and placement in one flow.
      </p>

      {/* Stepper */}
      <ol className="flex items-center gap-1 mb-8 flex-wrap">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (i < stepIndex) {
                  setError(null);
                  setStepIndex(i);
                }
              }}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                i === stepIndex
                  ? "bg-indigo-600 text-white"
                  : i < stepIndex
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              <span>{i + 1}</span> {STEP_TITLES[s]}
            </button>
            {i < steps.length - 1 && <span className="mx-1 text-gray-300">→</span>}
          </li>
        ))}
      </ol>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
          {created.length > 0 && (
            <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
              {created.map((c) => (
                <li key={c.href}>
                  Already saved: {c.label} ({c.href})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {progress && <p className="mb-4 text-sm text-indigo-700">{progress}</p>}

      {/* ── Step bodies ── */}
      {step === "link" && (
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Approved Admission</h2>
          <p className="text-sm text-gray-500">
            Registering after approval: pick the approved admission to register the
            child from, or continue without one for a walk-in.
          </p>
          {linkLoading ? (
            <p className="text-sm text-gray-500">Loading approved admissions…</p>
          ) : (
            <div>
              {label("Admission")}
              <select
                value={linkAdmissionId}
                onChange={(e) => pickAdmission(e.target.value)}
                className={inputClass()}
              >
                <option value="">Walk-in (no admission)</option>
                {approvedAdmissions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.reference_number}
                    {a.decision ? ` — ${a.decision.slice(0, 40)}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>
      )}

      {step === "referral" && (
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Referral</h2>
          {!caps.child && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                {label("Child first name", true)}
                <input value={refChildFirst} onChange={(e) => setRefChildFirst(e.target.value)} className={inputClass()} />
              </div>
              <div>
                {label("Child last name", true)}
                <input value={refChildLast} onChange={(e) => setRefChildLast(e.target.value)} className={inputClass()} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {label("Source", true)}
              <select value={refSource} onChange={(e) => setRefSource(e.target.value)} className={inputClass()}>
                {REFERRAL_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {label("Priority")}
              <select value={refPriority} onChange={(e) => setRefPriority(e.target.value)} className={inputClass()}>
                {REFERRAL_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            {label("Reason for referral", true)}
            <textarea value={refReason} onChange={(e) => setRefReason(e.target.value)} rows={3} className={inputClass()} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {label("Referrer name")}
              <input value={referrerName} onChange={(e) => setReferrerName(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Referrer contact")}
              <input value={referrerContact} onChange={(e) => setReferrerContact(e.target.value)} className={inputClass()} />
            </div>
          </div>
        </section>
      )}

      {step === "child" && (
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Child</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {label("First name", true)}
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Last name", true)}
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Middle name")}
              <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Preferred name")}
              <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Date of birth", true)}
              <input type="date" value={dob} max={todayIso()} onChange={(e) => setDob(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Gender", true)}
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass()}>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {label("Nationality")}
              <input value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Admission date", true)}
              <input type="date" value={admissionDate} max={todayIso()} onChange={(e) => setAdmissionDate(e.target.value)} className={inputClass()} />
            </div>
          </div>
        </section>
      )}

      {step === "guardian" && (
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Guardian</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {label("First name", true)}
              <input value={gFirst} onChange={(e) => setGFirst(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Last name", true)}
              <input value={gLast} onChange={(e) => setGLast(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Middle name")}
              <input value={gMiddle} onChange={(e) => setGMiddle(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Phone")}
              <input value={gPhone} onChange={(e) => setGPhone(e.target.value)} className={inputClass()} />
            </div>
            <div className="sm:col-span-2">
              {label("Email")}
              <input type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Relationship to child", true)}
              <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className={inputClass()}>
                {RELATIONSHIP_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                Primary contact
              </label>
            </div>
          </div>
          {!caps.link && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              Your role can register the guardian but cannot link them to the child. A centre
              manager or social worker will need to complete the linking.
            </p>
          )}
        </section>
      )}

      {step === "admission" && (
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Admission</h2>
          <p className="text-sm text-gray-500">
            Linked automatically to the referral created in step 1. Review happens separately.
          </p>
          <div>
            {label("Admission decision / notes")}
            <textarea value={admDecision} onChange={(e) => setAdmDecision(e.target.value)} rows={3} className={inputClass()} />
          </div>
          <div>
            {label("Conditions")}
            <textarea value={admConditions} onChange={(e) => setAdmConditions(e.target.value)} rows={2} className={inputClass()} />
          </div>
          <div>
            {label("Admitted date")}
            <input type="date" value={admittedDate} max={todayIso()} onChange={(e) => setAdmittedDate(e.target.value)} className={inputClass()} />
          </div>
        </section>
      )}

      {step === "placement" && (
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Placement</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {label("Placement type")}
              <select value={placementType} onChange={(e) => setPlacementType(e.target.value)} className={inputClass()}>
                {PLACEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {label("Start date", true)}
              <input type="date" value={placementStart} max={todayIso()} onChange={(e) => setPlacementStart(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Bed reference")}
              <input value={bedRef} onChange={(e) => setBedRef(e.target.value)} className={inputClass()} />
            </div>
            <div>
              {label("Room number")}
              <input value={roomNo} onChange={(e) => setRoomNo(e.target.value)} className={inputClass()} />
            </div>
          </div>
          <div>
            {label("Notes")}
            <textarea value={placementNotes} onChange={(e) => setPlacementNotes(e.target.value)} rows={2} className={inputClass()} />
          </div>
        </section>
      )}

      {/* Nav buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          disabled={stepIndex === 0 || saving}
          onClick={() => {
            setError(null);
            setStepIndex((i) => Math.max(i - 1, 0));
          }}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 border hover:bg-gray-50 disabled:opacity-50"
        >
          ← Back
        </button>
        {stepIndex < steps.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={submitAll}
            className="rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Registering…" : "Complete registration"}
          </button>
        )}
      </div>
    </div>
  );
}
