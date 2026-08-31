import Link from "next/link";
import {
  getSubscriptionStatusDisplay,
  getSubscriptionStatusBadge,
  formatPlanDate,
} from "@/types/subscription";

async function getMySubscription() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/subscriptions/mine`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function SubscriptionPage() {
  const mine = await getMySubscription();

  // Restricted access: show a clear, non-technical message (data stays preserved).
  if (!mine || !mine.approved) {
    const reason =
      mine?.reason ??
      "Your centre's subscription is currently inactive. Please contact the platform administrator.";
    const status = mine?.status ?? "none";
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscription</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your centre&apos;s subscription status
        </p>

        <div className="mt-6 max-w-xl bg-white rounded-lg border border-amber-200 p-6">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getSubscriptionStatusBadge(status)}`}
            >
              {getSubscriptionStatusDisplay(status)}
            </span>
          </div>
          <p className="mt-4 text-gray-700">{reason}</p>
          <p className="mt-2 text-sm text-gray-500">
            Your historical data remains safely stored and protected. You are not
            able to use normal services until access is restored by the platform
            administrator.
          </p>
        </div>
      </div>
    );
  }

  const sub = mine.subscription;
  const plan = sub?.plan;
  const planName = plan?.name ?? "Standard";
  const validUntil = sub?.status === "trial" ? sub.trial_ends_at : sub.end_date;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Subscription</h2>
      <p className="text-sm text-gray-500 mt-1">
        Your centre&apos;s subscription status
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2 max-w-3xl">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Plan
          </h3>
          <p className="mt-2 text-xl font-semibold text-gray-900">{planName}</p>
          {plan?.description ? (
            <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
          ) : null}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Status
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getSubscriptionStatusBadge(sub?.status ?? "none")}`}
            >
              {getSubscriptionStatusDisplay(sub?.status ?? "none")}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Valid Until
          </h3>
          <p className="mt-2 text-xl font-semibold text-gray-900">
            {formatPlanDate(validUntil)}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Includes
          </h3>
          <ul className="mt-2 text-sm text-gray-700 space-y-1">
            {(mine.enabledFeatures ?? []).length > 0 ? (
              mine.enabledFeatures.map((f: string) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> {f}
                </li>
              ))
            ) : (
              <li className="text-gray-500">Standard features</li>
            )}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Questions about your subscription?{" "}
        <Link href="/notifications" className="text-blue-600 hover:text-blue-800">
          Check notifications
        </Link>{" "}
        or contact the platform administrator.
      </p>
    </div>
  );
}
