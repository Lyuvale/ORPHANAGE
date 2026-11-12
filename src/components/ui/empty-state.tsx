import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
