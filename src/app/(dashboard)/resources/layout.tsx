import ResourcesNav from "./_components/resources-nav";

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Resources &amp; Support</h1>
        <p className="mt-1 text-sm text-gray-500">
          Trace support from Source → Fund → Expense → Benefit → Child
        </p>
      </div>
      <ResourcesNav />
      {children}
    </div>
  );
}
