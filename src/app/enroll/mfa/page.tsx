import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyEnrolledFactor } from "./actions";

type SearchParams = Promise<{ error?: string; factor_id?: string }>;

export default async function EnrollMfaPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, factor_id } = await searchParams;
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/admin/sign-in");

  let factorId = factor_id;
  let qrDataUrl: string | null = null;
  let secret: string | null = null;

  if (!factorId) {
    const { data, error: enrollErr } = await sb.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator",
    });
    if (enrollErr || !data) {
      return (
        <main className="container flex min-h-dvh items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Couldn't start TOTP enrollment</CardTitle>
              <CardDescription>{enrollErr?.message ?? "Unknown error."}</CardDescription>
            </CardHeader>
          </Card>
        </main>
      );
    }
    factorId = data.id;
    secret = data.totp.secret;
    qrDataUrl = await QRCode.toDataURL(data.totp.uri, { width: 240, margin: 1 });
  }

  return (
    <main className="container flex min-h-dvh items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Scan this QR code with Authy, 1Password, or Google Authenticator. Then enter the 6-digit code to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="TOTP QR code" className="rounded-md border border-border" />
              {secret && (
                <p className="break-all text-xs text-muted-foreground">
                  Or enter manually: <code>{secret}</code>
                </p>
              )}
            </div>
          )}
          <form action={verifyEnrolledFactor} className="flex flex-col gap-4">
            <input type="hidden" name="factor_id" value={factorId} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}
            <Button type="submit" size="lg">
              Confirm
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
