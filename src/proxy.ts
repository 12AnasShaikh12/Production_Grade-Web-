import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase Auth session cookie on admin routes (the documented @supabase/ssr pattern).
 * This is NOT the authorisation check — every admin page and action verifies the session itself.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  try {
    await supabase.auth.getUser();
  } catch {
    // Network failure: continue; the page-level check will treat the visitor as signed out.
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
