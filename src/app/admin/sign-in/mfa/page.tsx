import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { challengeAndVerify } from "./actions";

type SearchParams = Promise<{ error?: string }>;

export default async function AdminMfaPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/admin/sign-in");

  const { data: factors } = await sb.auth.mfa.listFactors();
  const totp = factors?.totp?.find((f) => f.status === "verified");
  if (!totp) {
    return (
      <main className="container flex min-h-dvh items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No TOTP factor enrolled</CardTitle>
            <CardDescription>
              Your account hasn't completed TOTP enrollment. Use your enrollment link to set it up.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="container flex min-h-dvh items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter your 6-digit code</CardTitle>
          <CardDescription>From your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={challengeAndVerify} className="flex flex-col gap-4">
            <input type="hidden" name="factor_id" value={totp.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Code</Label>
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
              Verify
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
