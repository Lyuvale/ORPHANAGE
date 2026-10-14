import RoleForm from "../_components/role-form";

export const metadata = {
  title: "New Role",
};

export default function NewRolePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Create Custom Role
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Build a role with only the permissions this staff member needs.
        </p>
      </div>
      <RoleForm />
    </div>
  );
}
