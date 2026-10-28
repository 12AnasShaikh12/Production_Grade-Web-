/** FormData helpers for admin forms. Values are validated again by the content schemas. */

export const text = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
export const nullable = (fd: FormData, name: string) => text(fd, name) || null;
export const checked = (fd: FormData, name: string) => fd.get(name) === "on" || fd.get(name) === "true";
export const integer = (fd: FormData, name: string, fallback = 0) => {
  const n = Number(text(fd, name));
  return Number.isInteger(n) ? n : fallback;
};
export const all = (fd: FormData, name: string) => fd.getAll(name).map((v) => String(v).trim()).filter(Boolean);

/** Collects indexed rows such as `rows.0.title`, `rows.1.title` into objects. */
export function rows(fd: FormData, prefix: string): Record<string, string>[] {
  const out = new Map<number, Record<string, string>>();
  for (const [key, value] of fd.entries()) {
    const m = key.match(new RegExp(`^${prefix}\\.(\\d+)\\.(\\w+)$`));
    if (!m) continue;
    const i = Number(m[1]);
    if (!out.has(i)) out.set(i, {});
    out.get(i)![m[2]] = String(value).trim();
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
