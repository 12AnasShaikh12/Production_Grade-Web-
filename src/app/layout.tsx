import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { publicSiteUrl } from "@/lib/config/env";
import { getSiteContent } from "@/lib/data/catalog";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getSiteContent();
  return {
    metadataBase: new URL(publicSiteUrl()),
    title: { default: `${brand.name} — ${brand.tagline} Skincare`, template: `%s | ${brand.name}` },
    description: brand.shortDescription,
    applicationName: brand.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: brand.name,
      locale: "en_IN",
      title: `${brand.name} — ${brand.tagline}`,
      description: brand.shortDescription,
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-ink px-5 py-3 text-sm font-semibold text-milk focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
