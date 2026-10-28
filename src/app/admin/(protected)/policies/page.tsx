import { savePolicyAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { AArea, ASelect, AText, Panel } from "@/components/admin/inputs";
import { Notice } from "@/components/ui/primitives";
import { loadContent } from "@/lib/data/content";

export const metadata = { title: "Policies" };

export default async function AdminPolicies() {
  const { content } = await loadContent();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Customer policies</p>
        <h1 className="mt-2 text-h2 text-ink">Policies</h1>
      </div>
      <Notice tone="warning" title="Owner-supplied text only">
        Paste policy text supplied and approved by the business (ideally reviewed by a legal adviser). The website never generates legal terms. Live
        payments stay disabled until all four policies are approved.
      </Notice>
      {content.policies.map((p) => (
        <Panel key={p.slug} title={p.title} description={`Status: ${p.status} · /policies/${p.slug}`}>
          <AdminForm action={savePolicyAction} submitLabel="Save policy">
            <input type="hidden" name="slug" value={p.slug} />
            <div className="grid gap-3 md:grid-cols-2">
              <AText label="Title" name="title" defaultValue={p.title} required maxLength={80} />
              <ASelect
                label="Status"
                name="status"
                defaultValue={p.status}
                options={[
                  { value: "missing", label: "Missing" },
                  { value: "draft", label: "Draft (not shown)" },
                  { value: "approved", label: "Approved (published)" },
                ]}
              />
            </div>
            <AArea label="Summary" name="summary" defaultValue={p.summary} rows={2} required maxLength={400} />
            <AArea label="Policy text" name="body" defaultValue={p.body} rows={10} maxLength={20000} hint="Blank line between paragraphs. Start a line with “## ” for a heading." />
          </AdminForm>
        </Panel>
      ))}
    </div>
  );
}
