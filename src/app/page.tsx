import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations();
  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-6 py-12 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{t("app.name")}</h1>
        <p className="mt-2 text-muted-foreground">{t("app.tagline")}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/sign-in"
          className="flex h-14 items-center justify-center rounded-md bg-primary text-base font-medium text-primary-foreground hover:opacity-90"
        >
          {t("home.staffSignIn")}
        </Link>
        <Link
          href="/admin/sign-in"
          className="flex h-11 items-center justify-center rounded-md border border-border text-sm font-medium hover:bg-secondary"
        >
          {t("home.adminSignIn")}
        </Link>
      </div>
    </main>
  );
}
