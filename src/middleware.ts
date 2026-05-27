import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { readStaffSessionFromCookie, STAFF_SESSION_COOKIE } from "@/lib/auth/staff-session";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          for (const { name, value } of cookies) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookies) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin")) {
    const isPublicAdmin = path === "/admin/sign-in" || path === "/admin/sign-in/mfa";
    if (!isPublicAdmin) {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/sign-in";
        return NextResponse.redirect(url);
      }
    }
  }

  if (path.startsWith("/clock")) {
    const session = await readStaffSessionFromCookie(
      request.cookies.get(STAFF_SESSION_COOKIE)?.value,
    );
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|api/sign-out).*)"],
};
