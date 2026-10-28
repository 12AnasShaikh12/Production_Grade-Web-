import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/config/env";
import { errorSummary, log } from "@/lib/log";
import { getServiceClient } from "@/lib/supabase/service";
import { LOCAL_SESSION_COOKIE, verifyLocalSession } from "./session";

export interface AdminSession {
  email: string;
  method: "supabase" | "local";
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authorised");
    this.name = "UnauthorizedError";
  }
}

export type AuthMode = "supabase" | "local" | "none";

export function adminAuthMode(): AuthMode {
  const env = getEnv();
  if (env.supabase.authConfigured) return "supabase";
  if (env.admin.localLoginEnabled) return "local";
  return "none";
}

/** Supabase server client bound to the request cookies (session refresh writes are best-effort). */
export async function supabaseAuthClient() {
  const env = getEnv();
  const store = await cookies();
  return createServerClient(env.supabase.url!, env.supabase.anonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component — cookies are refreshed by the proxy instead.
        }
      },
    },
  });
}

/** True if the email is allow-listed or has an admin/editor row in `admin_users`. */
export async function isAuthorisedAdmin(userId: string, email: string | undefined): Promise<boolean> {
  const env = getEnv();
  if (email && env.admin.emails.includes(email.toLowerCase())) return true;
  const db = getServiceClient();
  if (!db) return false;
  const { data, error } = await db.from("admin_users").select("role").eq("user_id", userId).maybeSingle();
  if (error) {
    log.error("admin.role_lookup_failed", { error: errorSummary(error) });
    return false;
  }
  return data?.role === "admin" || data?.role === "editor";
}

/** Resolves the current admin from the request. Every privileged operation must call this. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const mode = adminAuthMode();
  if (mode === "supabase") {
    try {
      const supabase = await supabaseAuthClient();
      // getUser() validates the JWT with Supabase Auth rather than trusting the cookie contents.
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return null;
      if (!(await isAuthorisedAdmin(data.user.id, data.user.email))) return null;
      return { email: data.user.email ?? "admin", method: "supabase" };
    } catch (error) {
      log.error("admin.session_failed", { error: errorSummary(error) });
      return null;
    }
  }
  if (mode === "local") {
    const token = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
    return verifyLocalSession(token, getEnv().admin.sessionSecret) ? { email: "local-admin", method: "local" } : null;
  }
  return null;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
