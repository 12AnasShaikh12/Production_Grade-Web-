import { Wordmark } from "@/components/layout/wordmark";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex-1 bg-milk-glow">
      <div className="container-page flex min-h-dvh flex-col items-start justify-center py-20">
        <Wordmark brandName="Amros Beauty" />
        <p className="eyebrow mt-16">404</p>
        <h1 className="mt-4 text-h1 text-ink">This page has slipped away</h1>
        <p className="mt-4 max-w-md text-ink-soft">The page you were looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/shop" variant="ghost">
            Shop the collection
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
