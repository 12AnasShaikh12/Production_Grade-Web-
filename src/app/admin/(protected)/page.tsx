import { ActionButton } from "@/components/admin/admin-form";
import { Panel } from "@/components/admin/inputs";
import { Badge } from "@/components/ui/primitives";
import { reindexAction, verifyNvidiaAction } from "@/app/admin/actions";
import { buildLaunchChecklist, type ChecklistItem } from "@/lib/admin/checklist";
import { getVectorStore } from "@/lib/chat/runtime";
import { getEnv } from "@/lib/config/env";
import { loadContent } from "@/lib/data/content";
import { getRepository } from "@/lib/data/repositories";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const env = getEnv();
  const { content, source, degraded } = await loadContent();
  const repo = getRepository();
  const items = buildLaunchChecklist(content, env, { kind: source, degraded });
  let indexStatus: string;
  if (!env.nvidia.embeddingsConfigured) indexStatus = "Not configured — the assistant uses keyword retrieval and deterministic answers.";
  else {
    try {
      const s = await getVectorStore().status();
      indexStatus = s.chunkCount
        ? `${s.chunkCount} chunks indexed with ${s.model} (${s.indexedAt ? new Date(s.indexedAt).toLocaleString("en-IN") : "time unknown"}).`
        : "Configured, but nothing has been indexed yet.";
    } catch {
      indexStatus = "Index status unavailable — check that the database migration has been applied.";
    }
  }

  const todo = items.filter((i) => i.status === "todo").length;
  const warnings = items.filter((i) => i.status === "warning").length;
  const areas = [...new Set(items.map((i) => i.area))];

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-2 text-h2 text-ink">Launch readiness</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {todo} required item{todo === 1 ? "" : "s"} outstanding · {warnings} item{warnings === 1 ? "" : "s"} to review · Content store: <strong>{repo.kind}</strong>
          {repo.writable ? "" : " (read-only)"}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Assistant (NVIDIA RAG)" description={indexStatus}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <ActionButton action={reindexAction} label="Re-index knowledge" />
            <ActionButton action={verifyNvidiaAction} label="Verify NVIDIA models" />
          </div>
        </Panel>
        <Panel title="Live payments" description={items.find((i) => i.id === "live-payments")?.detail}>
          <Badge tone={items.find((i) => i.id === "live-payments")?.status === "done" ? "success" : "warning"}>
            {items.find((i) => i.id === "live-payments")?.status === "done" ? "Enabled" : "Disabled — contact-to-purchase mode"}
          </Badge>
        </Panel>
      </div>

      {areas.map((area) => (
        <Panel key={area} title={area}>
          <ul className="divide-y divide-line">
            {items
              .filter((i) => i.area === area)
              .map((i) => (
                <Row key={i.id} item={i} />
              ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

function Row({ item }: { item: ChecklistItem }) {
  const tone = item.status === "done" ? "success" : item.status === "warning" ? "warning" : "blush";
  const label = item.status === "done" ? "Done" : item.status === "warning" ? "Review" : "Required";
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div>
        <p className="text-sm font-medium text-ink">{item.label}</p>
        {item.detail && <p className="mt-0.5 text-xs text-ink-muted">{item.detail}</p>}
      </div>
      <Badge tone={tone}>{label}</Badge>
    </li>
  );
}
