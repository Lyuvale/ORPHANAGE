import { redirect } from "next/navigation";
import ConfirmClient from "./ConfirmClient";

export const metadata = {
  title: "Payment Confirmation",
};

export default async function PaymentConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const ref = params.ref;
  if (!ref) redirect("/donate");

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-xl px-4">
        <h1 className="text-2xl font-bold text-gray-900">Complete your payment</h1>
        <p className="mt-2 text-sm text-gray-600">
          This is the mock gateway used for testing. In production, your payment
          provider hosts this page. No card details pass through this platform.
        </p>
        <div className="mt-6">
          <ConfirmClient reference={ref} />
        </div>
      </div>
    </main>
  );
}