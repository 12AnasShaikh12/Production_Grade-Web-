import { LoginForm } from "@/components/admin/login-form";
import { adminAuthMode } from "@/lib/auth/admin";

export const metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  const mode = adminAuthMode();
  return (
    <div className="container-page flex justify-center py-20">
      <div className="w-full max-w-md rounded-lg border border-line bg-milk p-8 shadow-soft">
        <p className="eyebrow">Staff only</p>
        <h1 className="mt-3 text-h2 text-ink">Sign in</h1>
        {mode === "none" ? (
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink-soft">
            <p>Admin sign-in is not configured for this environment.</p>
            <p>
              For production, configure Supabase Auth (<code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>) and
              allow-list staff via <code>ADMIN_EMAILS</code> or the <code>admin_users</code> table. For local development only, set{" "}
              <code>ADMIN_LOCAL_PASSWORD</code> and a 32+ character <code>ADMIN_SESSION_SECRET</code>.
            </p>
          </div>
        ) : (
          <LoginForm mode={mode} />
        )}
      </div>
    </div>
  );
}
