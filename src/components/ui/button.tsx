import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "quiet";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-[background-color,color,box-shadow,transform,border-color] duration-[var(--duration-base)] ease-[var(--ease-silk)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-milk shadow-soft hover:bg-[#3d3430] hover:shadow-lift",
  secondary: "border border-ink/80 text-ink bg-milk/40 hover:bg-ink hover:text-milk",
  ghost: "border border-line text-ink bg-milk/60 hover:border-ink/60 hover:bg-milk",
  quiet: "text-ink underline-offset-4 hover:underline",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-12 px-6 text-sm",
  lg: "min-h-14 px-8 text-[0.95rem]",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "className"> & { variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
