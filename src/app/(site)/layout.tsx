import { ChatWidget } from "@/components/chat/chat-widget";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getSiteContent } from "@/lib/data/catalog";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const content = await getSiteContent();
  return (
    <>
      <SiteHeader brandName={content.brand.name} />
      <main id="main" className="flex-1 pb-20 sm:pb-24">
        {children}
      </main>
      <SiteFooter content={content} />
      <ChatWidget brandName={content.brand.name} />
    </>
  );
}
