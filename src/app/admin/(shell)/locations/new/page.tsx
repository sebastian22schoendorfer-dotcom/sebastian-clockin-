import { requireAdmin } from "@/lib/auth/admin-context";
import { LocationForm } from "@/components/admin/location-form";

type SearchParams = Promise<{ error?: string }>;

export default async function NewLocationPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">New location</h1>
      <LocationForm error={error} />
    </main>
  );
}
