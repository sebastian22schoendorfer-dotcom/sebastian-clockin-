import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { loadContractData, renderContractPdf } from "@/lib/contracts/server";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, ctx: { params: Params }): Promise<NextResponse> {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const data = await loadContractData(admin.tenant_id, id);
  if (!data) return NextResponse.json({ ok: false }, { status: 404 });

  const pdf = await renderContractPdf(data);
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="contract_${id}.pdf"`,
    },
  });
}
