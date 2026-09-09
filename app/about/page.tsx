import { siteConfig } from "@/config/site";

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-[60vh] max-w-6xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">About {siteConfig.shortName}</h1>
      <p className="mt-4 max-w-2xl text-muted">
        {siteConfig.name} is the working brand for this reusable storefront foundation. More complete business information will be added in a later content phase.
      </p>
    </main>
  );
}
