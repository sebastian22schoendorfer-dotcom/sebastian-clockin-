import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin-context";
import { loadContractData } from "@/lib/contracts/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignaturePad } from "@/components/contracts/signature-pad";
import { submitSignature } from "../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function SignContractPage({
  params, searchParams,
}: { params: Params; searchParams: SearchParams }) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const data = await loadContractData(ctx.tenant_id, id);
  if (!data) notFound();
  if (data.signed_at) redirect(`/admin/contracts/${id}`);

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Sign contract</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{data.staff.full_name}</CardTitle>
          <CardDescription>
            By signing, the employee accepts the terms of this employment agreement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitSignature} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={id} />
            <SignaturePad />
            {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}
            <div className="flex gap-3">
              <Button type="submit">Submit signature</Button>
              <Link href={`/admin/contracts/${id}`}
                className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm hover:bg-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
