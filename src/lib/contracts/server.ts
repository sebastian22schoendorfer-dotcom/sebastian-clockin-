import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServiceClient } from "@/lib/supabase/server";
import { ContractDocument } from "./template";
import type { ContractData } from "./types";

const BUCKET = "contracts";

export async function loadContractData(tenant_id: string, id: string): Promise<ContractData | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("contracts")
    .select(
      `id, tenant_id, rate_regular_usd, ot_policy, effective_from, effective_to,
       signed_at, signature_image_path,
       staff(full_name, email, job_role, contract_type, date_of_birth),
       locations:location_id(name, address),
       tenants:tenant_id(name)`,
    )
    .eq("id", id).eq("tenant_id", tenant_id)
    .is("soft_deleted_at", null).maybeSingle();

  if (!data) return null;

  type Raw = {
    id: string; tenant_id: string;
    rate_regular_usd: number;
    ot_policy: ContractData["ot_policy"];
    effective_from: string; effective_to: string | null;
    signed_at: string | null; signature_image_path: string | null;
    staff: ContractData["staff"];
    locations: ContractData["location"];
    tenants: ContractData["tenant"];
  };
  const r = data as unknown as Raw;
  return {
    id: r.id, tenant_id: r.tenant_id,
    staff: r.staff, location: r.locations, tenant: r.tenants,
    rate_regular_usd: r.rate_regular_usd, ot_policy: r.ot_policy,
    effective_from: r.effective_from, effective_to: r.effective_to,
    signed_at: r.signed_at, signature_image_path: r.signature_image_path,
  };
}

export async function loadSignatureDataUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const sb = createServiceClient();
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export async function renderContractPdf(data: ContractData): Promise<Buffer> {
  const sigDataUrl = await loadSignatureDataUrl(data.signature_image_path);
  return renderToBuffer(ContractDocument({ data, signatureDataUrl: sigDataUrl }));
}

export async function signContract(
  tenant_id: string,
  contract_id: string,
  signatureDataUrl: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sb = createServiceClient();

  const match = /^data:image\/png;base64,(.+)$/.exec(signatureDataUrl);
  if (!match) return { ok: false, reason: "Signature must be a PNG data URL." };
  const signatureBytes = Buffer.from(match[1], "base64");

  const sigPath = `${tenant_id}/${contract_id}/signature.png`;
  const { error: sigErr } = await sb.storage.from(BUCKET).upload(sigPath, signatureBytes, {
    contentType: "image/png", upsert: true,
  });
  if (sigErr) return { ok: false, reason: sigErr.message };

  const signedAt = new Date().toISOString();
  await sb.from("contracts")
    .update({ signed_at: signedAt, signature_image_path: sigPath })
    .eq("id", contract_id).eq("tenant_id", tenant_id);

  const data = await loadContractData(tenant_id, contract_id);
  if (!data) return { ok: false, reason: "Contract gone after sign." };
  const pdf = await renderContractPdf(data);
  const pdfPath = `${tenant_id}/${contract_id}/contract.pdf`;
  const { error: pdfErr } = await sb.storage.from(BUCKET).upload(pdfPath, pdf, {
    contentType: "application/pdf", upsert: true,
  });
  if (pdfErr) return { ok: false, reason: pdfErr.message };

  await sb.from("contracts")
    .update({ pdf_storage_path: pdfPath })
    .eq("id", contract_id).eq("tenant_id", tenant_id);

  return { ok: true };
}
