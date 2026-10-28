import { deleteKnowledgeAction, reindexAction, saveFallbacksAction, saveKnowledgeAction } from "@/app/admin/actions";
import { ActionButton, AdminForm } from "@/components/admin/admin-form";
import { AArea, ACheck, ASelect, AText, Panel } from "@/components/admin/inputs";
import { DEFAULT_FALLBACKS } from "@/lib/chat/fallbacks";
import { fallbackIntent, knowledgeDocType, type KnowledgeDocument } from "@/lib/content/schemas";
import { loadContent } from "@/lib/data/content";

export const metadata = { title: "Assistant knowledge" };

const typeOptions = knowledgeDocType.options.map((t) => ({ value: t, label: t }));

function DocFields({ doc }: { doc?: KnowledgeDocument }) {
  return (
    <>
      <input type="hidden" name="recordId" value={doc?.id ?? ""} />
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <AText label="Title" name="title" defaultValue={doc?.title} required maxLength={140} />
        <ASelect label="Type" name="docType" defaultValue={doc?.docType ?? "specification"} options={typeOptions} />
      </div>
      <AArea label="Content" name="content" defaultValue={doc?.content} rows={5} required maxLength={6000} />
      <AText label="Source / origin" name="source" defaultValue={doc?.source ?? "Owner"} required maxLength={200} hint="e.g. “Owner email 2026-11-02” or “Packaging label v1”." />
      <div className="flex flex-wrap gap-6">
        <ACheck name="approved" label="Approved" defaultChecked={doc?.approved ?? false} />
        <ACheck name="active" label="Active (current truth)" defaultChecked={doc?.active ?? true} />
      </div>
    </>
  );
}

export default async function AdminKnowledge() {
  const { content } = await loadContent();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Assistant</p>
        <h1 className="mt-2 text-h2 text-ink">Assistant knowledge</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          The assistant answers only from approved, active knowledge. Product, ingredient, FAQ and policy records are generated automatically from the
          structured content; add owner-supplied specifications here. Saving re-indexes automatically when NVIDIA embeddings are configured.
        </p>
      </div>
      <Panel title="Semantic index">
        <ActionButton action={reindexAction} label="Re-index now" />
      </Panel>
      <Panel title="Add a knowledge document">
        <AdminForm action={saveKnowledgeAction} submitLabel="Add document">
          <DocFields />
        </AdminForm>
      </Panel>
      {content.knowledge.map((doc) => (
        <Panel key={doc.id} title={doc.title} description={`${doc.docType} · ${doc.approved ? "approved" : "unapproved"} · ${doc.active ? "active" : "inactive"}`}>
          <AdminForm action={saveKnowledgeAction}>
            <DocFields doc={doc} />
          </AdminForm>
          <div className="mt-4 border-t hairline pt-4">
            <AdminForm action={deleteKnowledgeAction} submitLabel="Delete document" danger>
              <input type="hidden" name="recordId" value={doc.id} />
            </AdminForm>
          </div>
        </Panel>
      ))}
      <Panel
        title="Deterministic fallback responses"
        description="Used when the AI service or retrieval is unavailable. Placeholders: {brandName} {productName} {productShortName} {price} {ingredients} {skinTypes} {email} {phone} {instagram}. Values always come from the live product record."
      >
        <AdminForm action={saveFallbacksAction} submitLabel="Save fallback copy">
          {fallbackIntent.options.map((intent) => (
            <AArea
              key={intent}
              label={intent}
              name={`fallback.${intent}`}
              defaultValue={content.fallbacks[intent] ?? DEFAULT_FALLBACKS[intent]}
              rows={3}
              maxLength={1200}
            />
          ))}
        </AdminForm>
      </Panel>
    </div>
  );
}
