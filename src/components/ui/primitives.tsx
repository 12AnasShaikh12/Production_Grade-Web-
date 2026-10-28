import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  as: Tag = "h2",
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  id?: string;
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <Tag id={id} className={Tag === "h1" ? "text-h1 text-ink" : "text-h2 text-ink"}>
        {title}
      </Tag>
      {intro && <div className="mt-5 text-base leading-relaxed text-ink-soft sm:text-lg">{intro}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "blush" | "lavender" | "citrus" | "warning" | "success" }) {
  const tones = {
    neutral: "bg-pearl text-ink-soft border-line",
    blush: "bg-blush/60 text-blush-deep border-blush",
    lavender: "bg-lavender/70 text-lavender-deep border-lavender",
    citrus: "bg-citrus-soft text-citrus-deep border-citrus/40",
    warning: "bg-warning-soft text-warning border-citrus/40",
    success: "bg-success-soft text-success border-success/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Notice({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: ReactNode;
  tone?: "info" | "warning" | "danger" | "success";
}) {
  const tones = {
    info: "border-lavender bg-lavender/30 text-ink",
    warning: "border-citrus/50 bg-warning-soft text-ink",
    danger: "border-danger/30 bg-danger-soft text-ink",
    success: "border-success/30 bg-success-soft text-ink",
  };
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={`rounded-md border px-5 py-4 text-sm leading-relaxed ${tones[tone]}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-ink-soft">{children}</div>
    </div>
  );
}

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: ReactNode; intro?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b hairline bg-milk-glow">
      <div className="container-page py-16 sm:py-24">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} intro={intro} />
      </div>
    </section>
  );
}

export function ConceptNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-ink-muted ${className}`}>
      Conceptual packaging visualisation. Final packaging has not been confirmed and may differ.
    </p>
  );
}
