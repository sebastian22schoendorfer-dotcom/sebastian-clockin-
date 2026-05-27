import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth/admin-context";
import { loadContractData } from "@/lib/contracts/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Params = Promise<{ id: string }>;

export default async function ContractDetail({ params }: { params: Params }) {
  const ctx = await requireOwner();
  const { id } = await params;
  const data = await loadContractData(ctx.tenant_id, id);
  if (!data) notFound();

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Contract</h1>

      <Card>
        <CardHeader>
          <CardTitle>{data.staff.full_name}</CardTitle>
          <CardDescription>
            {data.staff.email} · {data.location.name} · USD {data.rate_regular_usd.toFixed(2)}/h
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Effective {data.effective_from} → {data.effective_to ?? "open"}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">Status:</span>{" "}
            {data.signed_at ? (
              <span className="text-foreground">Signed {new Date(data.signed_at).toLocaleString()}</span>
            ) : (
              <span className="text-destructive">Unsigned</span>
            )}
          </p>
          <div className="mt-4 flex gap-3">
            <Link href={`/admin/contracts/${id}/pdf`} target="_blank"
              className="inline-flex h-11 items-center justify-center rounded-md bg-secondary px-4 text-sm hover:opacity-90">
              View PDF
            </Link>
            {!data.signed_at && (
              <Link href={`/admin/contracts/${id}/sign`}>
                <Button>Sign contract</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
