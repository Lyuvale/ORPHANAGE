import type { PublicCentreNeed } from "@/types/centre-need";

const numberFormat = new Intl.NumberFormat("en-TZ", {
  maximumFractionDigits: 2,
});

function formatTzs(value: number): string {
  return `TZS ${numberFormat.format(Number(value) || 0)}`;
}

function NeedCard({ need }: { need: PublicCentreNeed }) {
  const percent = Math.min(100, Math.max(0, need.percent));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {need.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={need.image_url}
          alt=""
          className="mb-4 w-full max-h-64 object-cover rounded-lg"
        />
      ) : null}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">{need.title}</h3>
          {need.description ? (
            <p className="mt-1 text-sm text-gray-500">{need.description}</p>
          ) : null}
        </div>
        {need.is_completed ? (
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
            Completed
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-zinc-100">
          <div
            className={`h-2 rounded-full ${
              need.is_completed ? "bg-green-500" : "bg-emerald-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-sm text-gray-700">
          <span>
            {formatTzs(need.raised_amount)} / {formatTzs(need.target_amount)}
          </span>
          <span>{numberFormat.format(need.percent)}%</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {need.is_completed
            ? "Fully funded"
            : `${formatTzs(need.remaining_amount)} still needed`}
        </p>
      </div>
    </div>
  );
}

/**
 * Public "Centre Needs" showcase for /s/[code].
 *
 * Renders ONLY PublicCentreNeed fields (title, description, image_url,
 * target/raised/remaining/percent/is_completed). Never receives child,
 * guardian, staff, case, support, payment, note, actor or source data.
 */
export default function NeedsShowcase({
  needs,
}: {
  needs: PublicCentreNeed[];
}) {
  if (!Array.isArray(needs) || needs.length === 0) return null;

  const active = needs.filter((need) => !need.is_completed);
  const completed = needs.filter((need) => need.is_completed);

  return (
    <section className="mt-10">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Centre Needs</h2>
        <p className="mt-1 text-sm text-gray-500">
          Help us meet our centre&apos;s current needs. Every contribution
          brings us closer.
        </p>
      </div>

      {active.length > 0 && (
        <div className="mt-6 space-y-6">
          {active.map((need) => (
            <NeedCard key={need.id} need={need} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-900">Completed</h3>
          <div className="mt-4 space-y-6">
            {completed.map((need) => (
              <NeedCard key={need.id} need={need} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
