import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { createAdminClient } from "@/lib/supabase/admin";

async function getCentre(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("centres")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

export default async function CentreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Tenant isolation: a centre user may only view their OWN centre.
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never);
  if (id !== ctx.centre.id) {
    redirect(`/centres/${ctx.centre.id}`);
  }

  const centre = await getCentre(id);

  if (!centre) {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/centres" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Centres
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{centre.name}</h2>
          <p className="text-sm text-gray-500 font-mono mt-1">Code: {centre.code}</p>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            centre.status === "active"
              ? "bg-green-100 text-green-800"
              : centre.status === "suspended"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {centre.status}
        </span>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Contact Information
          </h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm text-gray-900">{centre.contact_email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900">{centre.contact_phone ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Address
          </h3>
          <div className="text-sm text-gray-900 space-y-1">
            {centre.address_line1 && <p>{centre.address_line1}</p>}
            {centre.address_line2 && <p>{centre.address_line2}</p>}
            <p>
              {[centre.city, centre.state, centre.postal_code].filter(Boolean).join(", ") ||
                "—"}
            </p>
            <p>{centre.country}</p>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Metadata
          </h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">
                {new Date(centre.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Last Updated</dt>
              <dd className="text-sm text-gray-900">
                {new Date(centre.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
