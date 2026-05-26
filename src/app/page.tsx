import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("app");
  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t("name")}</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
      <p className="mt-8 text-sm text-muted-foreground">
        Foundations scaffolded. Auth, locations, staff, and clock loop come next.
      </p>
    </main>
  );
}
