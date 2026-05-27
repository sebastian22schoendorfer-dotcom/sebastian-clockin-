import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Page not found.</h1>
      <Link href="/" className="text-sm underline">Back to home</Link>
    </main>
  );
}
