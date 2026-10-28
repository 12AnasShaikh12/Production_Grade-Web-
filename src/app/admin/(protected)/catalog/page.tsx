import { saveCategoriesAction, saveIngredientsAction, saveSkinTypesAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { AArea, ACheck, AText, Panel } from "@/components/admin/inputs";
import { sortedCategories, sortedSkinTypes } from "@/lib/content/selectors";
import { loadContent } from "@/lib/data/content";

export const metadata = { title: "Categories & ingredients" };

export default async function AdminCatalog() {
  const { content } = await loadContent();
  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Catalog</p>
        <h1 className="mt-2 text-h2 text-ink">Categories, skin types & ingredients</h1>
      </div>

      <Panel title="Categories" description="Display labels marked unapproved are interpretations of the owner's original wording and appear in the launch checklist.">
        <AdminForm action={saveCategoriesAction} submitLabel="Save categories">
          {sortedCategories(content).map((c, i) => (
            <div key={c.id} className="grid gap-3 rounded-md border border-line p-4 md:grid-cols-[1fr_2fr_6rem]">
              <input type="hidden" name={`categories.${i}.id`} value={c.id} />
              <input type="hidden" name={`categories.${i}.ownerLabel`} value={c.ownerLabel} />
              <input type="hidden" name={`categories.${i}.isAll`} value={String(c.isAll)} />
              <AText label={`Label (owner: “${c.ownerLabel}”)`} name={`categories.${i}.label`} defaultValue={c.label} required maxLength={60} />
              <AArea label="Description" name={`categories.${i}.description`} defaultValue={c.description} rows={2} required maxLength={300} />
              <AText label="Order" name={`categories.${i}.sortOrder`} type="number" defaultValue={c.sortOrder} />
              <ACheck name={`categories.${i}.labelApproved`} label="Label approved by owner" defaultChecked={c.labelApproved} />
            </div>
          ))}
        </AdminForm>
      </Panel>

      <Panel title="Skin types">
        <AdminForm action={saveSkinTypesAction} submitLabel="Save skin types">
          {sortedSkinTypes(content).map((s, i) => (
            <div key={s.id} className="grid gap-3 rounded-md border border-line p-4 md:grid-cols-[1fr_2fr_6rem]">
              <input type="hidden" name={`skinTypes.${i}.id`} value={s.id} />
              <AText label="Label" name={`skinTypes.${i}.label`} defaultValue={s.label} required maxLength={60} />
              <AArea label="Description (non-diagnostic)" name={`skinTypes.${i}.description`} defaultValue={s.description} rows={2} required maxLength={400} />
              <AText label="Order" name={`skinTypes.${i}.sortOrder`} type="number" defaultValue={s.sortOrder} />
            </div>
          ))}
        </AdminForm>
      </Panel>

      <Panel
        title="Ingredients"
        description="“General information” is education about the ingredient. Use “Verified note” only for confirmed facts about the finished formula."
      >
        <AdminForm action={saveIngredientsAction} submitLabel="Save ingredients">
          {content.ingredients.map((ing, i) => (
            <div key={ing.id} className="space-y-3 rounded-md border border-line p-4">
              <input type="hidden" name={`ingredients.${i}.id`} value={ing.id} />
              <input type="hidden" name={`ingredients.${i}.suppliedName`} value={ing.suppliedName ?? ""} />
              <div className="grid gap-3 md:grid-cols-2">
                <AText label="Name" name={`ingredients.${i}.name`} defaultValue={ing.name} required maxLength={80} />
                <AText label="Image path" name={`ingredients.${i}.image`} defaultValue={ing.image} required />
              </div>
              <AArea label="Role (short)" name={`ingredients.${i}.role`} defaultValue={ing.role} rows={2} required maxLength={300} />
              <AArea label="General information" name={`ingredients.${i}.generalInfo`} defaultValue={ing.generalInfo} rows={3} required maxLength={1200} />
              <AArea label="Verified note about the KMG formula" name={`ingredients.${i}.verifiedProductNote`} defaultValue={ing.verifiedProductNote} rows={2} maxLength={600} />
              <ACheck name={`ingredients.${i}.approved`} label="Approved for publication" defaultChecked={ing.approved} />
            </div>
          ))}
        </AdminForm>
      </Panel>
    </div>
  );
}
