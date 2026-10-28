import { deleteFaqAction, saveFaqAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { AArea, ACheck, ASelect, AText, Panel } from "@/components/admin/inputs";
import { faqCategory, type Faq } from "@/lib/content/schemas";
import { loadContent } from "@/lib/data/content";

export const metadata = { title: "FAQs" };

const categoryOptions = faqCategory.options.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }));

function FaqFields({ faq }: { faq?: Faq }) {
  return (
    <>
      <input type="hidden" name="recordId" value={faq?.id ?? ""} />
      <AText label="Question" name="question" defaultValue={faq?.question} required maxLength={240} />
      <AArea
        label="Answer"
        name="answer"
        defaultValue={faq?.answer}
        rows={3}
        required
        maxLength={1500}
        hint="Placeholders: {productName} {productShortName} {price} {ingredients} {skinTypes} {email} {phone} {instagram} {brandName}"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <ASelect label="Topic" name="category" defaultValue={faq?.category ?? "product"} options={categoryOptions} />
        <AText label="Order" name="sortOrder" type="number" defaultValue={faq?.sortOrder ?? 500} />
        <div className="pt-6">
          <ACheck name="approved" label="Approved (public + assistant)" defaultChecked={faq?.approved ?? false} />
        </div>
      </div>
    </>
  );
}

export default async function AdminFaqs() {
  const { content } = await loadContent();
  const faqs = [...content.faqs].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Content</p>
        <h1 className="mt-2 text-h2 text-ink">FAQs</h1>
        <p className="mt-2 text-sm text-ink-soft">Approved FAQs appear on the site and are indexed as assistant knowledge.</p>
      </div>
      <Panel title="Add a question">
        <AdminForm action={saveFaqAction} submitLabel="Add FAQ">
          <FaqFields />
        </AdminForm>
      </Panel>
      {faqs.map((f) => (
        <Panel key={f.id} title={f.question}>
          <AdminForm action={saveFaqAction}>
            <FaqFields faq={f} />
          </AdminForm>
          <div className="mt-4 border-t hairline pt-4">
            <AdminForm action={deleteFaqAction} submitLabel="Delete FAQ" danger>
              <input type="hidden" name="recordId" value={f.id} />
            </AdminForm>
          </div>
        </Panel>
      ))}
    </div>
  );
}
