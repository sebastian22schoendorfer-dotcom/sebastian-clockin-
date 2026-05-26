import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInStaff } from "./actions";

type SearchParams = Promise<{ error?: string }>;

export default async function StaffSignInPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  return (
    <main className="container flex min-h-dvh items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your email and 6-digit PIN.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInStaff} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}
            <Button type="submit" size="lg">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
