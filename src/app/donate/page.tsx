import DonateClient from "./DonateClient";

export const metadata = {
  title: "Support a Centre",
};

export default function DonatePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-3xl font-bold text-gray-900">Support a Children&apos;s Centre</h1>
        <p className="mt-2 text-gray-600">
          Your contribution goes directly to the centre you choose.
        </p>
        <div className="mt-8">
          <DonateClient />
        </div>
      </div>
    </main>
  );
}