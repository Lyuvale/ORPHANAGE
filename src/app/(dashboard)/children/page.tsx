import Link from "next/link";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import { caregiverAssignmentScope } from "@/lib/caregivers/caregiver.service";
import { listChildren } from "@/lib/children/child.service";
import {
  childSearchSchema,
  type ChildSearchSchema,
} from "@/lib/children/child.validation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const REPORT_OPTIONS = [
  { value: "by-status", label: "Children by Status" },
  { value: "detail", label: "Children Details" },
  { value: "by-age", label: "Children by Age Group" },
  { value: "admissions", label: "Admission History" },
  { value: "status-history", label: "Status History" },
];

interface ChildRow {
  id: string;
  reference_number: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  status: string;
  admission_date: string;
  date_of_birth: string;
}

async function loadChildren(
  searchParams: Record<string, string | undefined>,
): Promise<{ data: ChildRow[]; count: number; showRegister: boolean }> {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });

    const parsed = childSearchSchema.safeParse({
      status: searchParams.status,
      search: searchParams.search,
      limit: searchParams.limit,
      offset: searchParams.offset,
    });
    const filters: Partial<ChildSearchSchema> = parsed.success
      ? parsed.data
      : {};

    const admin = createAdminClient();
    // Caregivers only see their assigned children; everyone else sees the centre.
    const { assignedIds } = await caregiverAssignmentScope(
      admin,
      supabase as never,
      ctx,
    );

    const [{ data, count }, showRegister] = await Promise.all([
      listChildren(admin, {
        centre_id: ctx.centre.id,
        status: filters.status,
        search: filters.search,
        limit: filters.limit,
        offset: filters.offset,
        ids: assignedIds ?? undefined,
      }),
      can(supabase as never, ctx, "children.create"),
    ]);

    return {
      data: (data ?? []) as unknown as ChildRow[],
      count,
      showRegister,
    };
  } catch {
    return { data: [], count: 0, showRegister: false };
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    transferred: "bg-blue-100 text-blue-800",
    graduated: "bg-purple-100 text-purple-800",
    alumni: "bg-zinc-100 text-gray-800",
    deactivated: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-zinc-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function ChildrenListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: children, count, showRegister } = await loadChildren(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Children"
        subtitle="Everyone currently registered at this centre."
        actions={
          <div className="flex items-center gap-3">
            <ReportExportDialog
              apiPath="/api/reports/children"
              title="Report / Export"
              options={REPORT_OPTIONS}
              fileName="children"
            />
            {showRegister && (
              <Link
                href="/register"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                New Registration
              </Link>
            )}
          </div>
        }
      />

      <form className="flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          placeholder="Search by name or reference..."
          defaultValue={params.search ?? ""}
          className="block w-full max-w-md rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="block rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="transferred">Transferred</option>
          <option value="graduated">Graduated</option>
          <option value="alumni">Alumni</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
        >
          Search
        </button>
      </form>

      <Card>
        {children.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No children found"
              description={showRegister ? "Start a new registration to add a child." : undefined}
              action={
                showRegister ? (
                  <Link
                    href="/register"
                    className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    New Registration
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-zinc-50">
                <tr>
                  {["Reference", "Name", "Status", "Admission Date", "Date of Birth"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {children.map((child) => (
                  <tr key={child.id} className="transition-colors hover:bg-zinc-50/60">
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-mono text-zinc-500">
                      <Link
                        href={`/children/${child.id}`}
                        className="text-zinc-600 hover:text-zinc-700"
                      >
                        {child.reference_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-zinc-900">
                      <Link
                        href={`/children/${child.id}`}
                        className="text-zinc-600 hover:text-zinc-700"
                      >
                        {child.first_name}
                        {child.middle_name ? ` ${child.middle_name}` : ""}{" "}
                        {child.last_name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm">
                      <StatusBadge status={child.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-zinc-500">
                      {new Date(child.admission_date).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-zinc-500">
                      {new Date(child.date_of_birth).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-sm text-zinc-500">
        {count} {count === 1 ? "child" : "children"} total
      </p>
    </div>
  );
}
