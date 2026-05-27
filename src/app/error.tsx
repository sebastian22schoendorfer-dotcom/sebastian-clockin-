"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app:error]", error);
  }, [error]);

  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong.</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "Unexpected error."}
        {error.digest && <> <code className="text-xs">[{error.digest}]</code></>}
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
