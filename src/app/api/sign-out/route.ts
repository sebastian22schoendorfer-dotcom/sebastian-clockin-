import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { clearStaffSession } from "@/lib/auth/staff-session";

export async function POST(): Promise<NextResponse> {
  const sb = await createServerClient();
  await sb.auth.signOut();
  await clearStaffSession();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
