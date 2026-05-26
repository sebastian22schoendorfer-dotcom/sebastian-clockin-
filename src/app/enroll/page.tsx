import { redirect } from "next/navigation";
import { verifyEnrollmentToken } from "@/lib/auth/enrollment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPasswordAndSignIn } from "./actions";

type SearchParams = Promise<{ token?: string; error?: string }>;

export default async function EnrollPage({ searchParams }: { searchParams: SearchParams }) {
  const { token, error } = await searchParams;
  if (!token) redirect("/");

  const record = await verifyEnrollmentToken(token);
  if (!record) {
    return (
      <main className="container flex min-h-dvh items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enrollment link invalid</CardTitle>
            <CardDescription>
              This link has already been used, expired, or doesn't match a pending enrollment.
              Re-run <code>npm run seed</code> to generate a new one.
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
          <CardTitle>Welcome to ClockIn</CardTitle>
          <CardDescription>
            Set a password for your Owner account. We'll enroll two-factor authentication on the next step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setPasswordAndSignIn} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
              />
              <p className="text-xs text-muted-foreground">At least 12 characters.</p>
            </div>
            {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}
            <Button type="submit" size="lg">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
