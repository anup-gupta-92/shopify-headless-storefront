import { siteConfig } from "@/config/site";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 w-full border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted sm:flex-row">
        <p>
          © {currentYear} {siteConfig.footer.businessName}. All rights reserved.
        </p>
        <p className="font-mono text-xs">{siteConfig.footer.tagline}</p>
      </div>
    </footer>
  );
}
