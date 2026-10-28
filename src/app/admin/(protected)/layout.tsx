import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { logoutAction } from "@/app/admin/actions";
import { getAdminSession } from "@/lib/auth/admin";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/catalog", label: "Categories & ingredients" },
  { href: "/admin/faqs", label: "FAQs" },
  { href: "/admin/knowledge", label: "Assistant knowledge" },
  { href: "/admin/policies", label: "Policies" },
  { href: "/admin/settings", label: "Store settings" },
];

export default function ProtectedAdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <Suspense fallback={<div className="container-page py-16"><div className="skeleton h-96" /></div>}>
        <Gate>{children}</Gate>
      </Suspense>
      {/* Admin pages are intentionally rendered per request (fresh data, per-user session). */}
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </>
  );
}

async function DynamicMarker() {
  await connection();
  return null;
}

/** Server-side authorisation for every protected admin page (UI hiding is not authorisation). */
async function Gate({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[14rem_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <nav aria-label="Admin">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-milk hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6 border-t hairline pt-4 text-xs text-ink-muted">
          <p className="break-all">Signed in as {session.email}</p>
          <form action={logoutAction}>
            <button type="submit" className="mt-2 font-semibold text-ink underline underline-offset-4">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
