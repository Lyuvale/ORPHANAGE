"use client";

import { useState, useEffect, useCallback } from "react";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface EmergencyContact {
  name?: string;
  relation?: string;
  phone?: string;
}

export interface EmergencyHealthViewData {
  child_id: string;
  blood_group: string | null;
  critical_allergies: Array<{ name: string; severity?: string; reaction?: string }>;
  important_conditions: Array<{ name: string; notes?: string }>;
  active_medications: Array<{ medication_name: string; dosage: string | null; frequency: string | null }>;
  emergency_health_info: string | null;
  emergency_contacts: EmergencyContact[];
  active_alerts: Array<{ title: string; description: string | null; alert_type: string }>;
}

export default function EmergencyViewPage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [view, setView] = useState<EmergencyHealthViewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = useCallback(async () => {
    try {
      const res = await fetch("/api/children?limit=200");
      if (!res.ok) throw new Error("Failed to load children");
      const data = await res.json();
      setChildren(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const fetchView = useCallback(async (childId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/health/emergency?child_id=${childId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load emergency view");
      }
      const data = await res.json();
      setView(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setView(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchView(selectedChild);
    } else {
      setView(null);
    }
  }, [selectedChild, fetchView]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Emergency Health View</h1>
        <p className="text-muted-foreground mt-1">
          Restricted, essential health information for rapid access. Sensitive medical history is not shown.
        </p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">{error}</div>}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium">Select Child</label>
        <select
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm w-full max-w-md"
        >
          <option value="">Choose a child...</option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : view ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-lg font-semibold">Blood Group</h2>
            <div className="text-lg font-medium">
              {view.blood_group ? view.blood_group.replace("_", " ") : "Unknown"}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-lg font-semibold">Critical Allergies</h2>
            {view.critical_allergies.length === 0 ? (
              <p className="text-muted-foreground">None recorded</p>
            ) : (
              <ul className="space-y-1">
                {view.critical_allergies.map((a, i) => (
                  <li key={i}>
                    <span className="font-medium text-red-700">{a.name}</span>
                    {a.severity ? ` (${a.severity})` : ""}
                    {a.reaction ? ` — ${a.reaction}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-lg font-semibold">Important Conditions</h2>
            {view.important_conditions.length === 0 ? (
              <p className="text-muted-foreground">None recorded</p>
            ) : (
              <ul className="space-y-1">
                {view.important_conditions.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.name}</span>
                    {c.notes ? ` — ${c.notes}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-lg font-semibold">Active Medications</h2>
            {view.active_medications.length === 0 ? (
              <p className="text-muted-foreground">None</p>
            ) : (
              <ul className="space-y-1">
                {view.active_medications.map((m, i) => (
                  <li key={i}>
                    <span className="font-medium">{m.medication_name}</span>
                    {m.dosage ? ` — ${m.dosage}` : ""}
                    {m.frequency ? ` (${m.frequency})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-lg font-semibold">Emergencies / Notes</h2>
            <p>{view.emergency_health_info || "No notes recorded"}</p>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-lg font-semibold">Emergency Contacts</h2>
            {view.emergency_contacts.length === 0 ? (
              <p className="text-muted-foreground">None recorded</p>
            ) : (
              <ul className="space-y-1">
                {view.emergency_contacts.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.name || "Unknown"}</span>
                    {c.relation ? ` (${c.relation})` : ""}
                    {c.phone ? ` — ${c.phone}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-red-200 p-4 lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-red-700">Active Alerts</h2>
            {view.active_alerts.length === 0 ? (
              <p className="text-muted-foreground">No active alerts</p>
            ) : (
              <ul className="space-y-2">
                {view.active_alerts.map((a, i) => (
                  <li key={i} className="rounded-md bg-red-50 p-3">
                    <div className="font-medium">{a.title}</div>
                    {a.description ? (
                      <div className="text-sm text-muted-foreground">{a.description}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : selectedChild ? (
        <div className="py-8 text-center text-muted-foreground">
          No emergency health information available for this child.
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          Select a child to view emergency health information
        </div>
      )}
    </div>
  );
}
