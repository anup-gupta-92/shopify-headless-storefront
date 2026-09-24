import Link from "next/link";
import { siteConfig } from "@/config/site";

const shopLinks = [
  { label: "PPE Gear", href: "/collections/safety-gear" },
  { label: "Packaging Supplies", href: "/collections/packaging-supplies" },
  { label: "Abrasives", href: "/collections/abrasives" },
  { label: "Surface Protection & Cleaning", href: "/collections/protection-cleaning" },
  { label: "Shop All", href: "/shop" },
] as const;

const helpLinks = [
  { label: "Contact Us", href: "/contact" },
  { label: "Shipping Policy", href: "/policies/shipping-policy" },
  { label: "Refund Policy", href: "/policies/refund-policy" },
  { label: "Privacy Policy", href: "/policies/privacy-policy" },
  { label: "Terms of Service", href: "/policies/terms-of-service" },
] as const;

const footerLinkClasses =
  "inline-flex min-h-9 items-center rounded text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function phoneLabel(phone: string) {
  const ukMobile = phone.match(/^\+44(\d{4})(\d{6})$/);
  return ukMobile ? `+44 ${ukMobile[1]} ${ukMobile[2]}` : phone;
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 w-full border-t border-border bg-surface text-sm">
      <div className="site-container grid gap-7 py-9 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-8">
        <section aria-labelledby="footer-about-heading">
          <h2 id="footer-about-heading" className="text-base font-bold text-foreground">
            {siteConfig.footer.businessName}
          </h2>
          <p className="mt-3 max-w-sm leading-relaxed text-muted">{siteConfig.footer.tagline}</p>
        </section>

        <nav aria-labelledby="footer-shop-heading">
          <h2 id="footer-shop-heading" className="text-sm font-bold uppercase tracking-wider text-foreground">Shop</h2>
          <ul className="mt-2 space-y-0.5">
            {shopLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLinkClasses}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-help-heading">
          <h2 id="footer-help-heading" className="text-sm font-bold uppercase tracking-wider text-foreground">Help</h2>
          <ul className="mt-2 space-y-0.5">
            {helpLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLinkClasses}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="footer-contact-heading">
          <h2 id="footer-contact-heading" className="text-sm font-bold uppercase tracking-wider text-foreground">Contact</h2>
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="sr-only">Phone</dt>
              <dd><a href={`tel:${siteConfig.contact.tel}`} className={footerLinkClasses}>Phone: {phoneLabel(siteConfig.contact.tel)}</a></dd>
            </div>
            <div>
              <dt className="sr-only">WhatsApp</dt>
              <dd>
                <a
                  href={siteConfig.contact.whatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Message Apex Business Supplies on WhatsApp (opens in a new tab)"
                  className={footerLinkClasses}
                >
                  WhatsApp
                </a>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Email</dt>
              <dd><a href={`mailto:${siteConfig.contact.email}`} className={`${footerLinkClasses} break-all`}>{siteConfig.contact.email}</a></dd>
            </div>
          </dl>
          <div className="mt-4 space-y-1 text-xs leading-relaxed text-muted">
            <p>Same-day dispatch before 3 PM</p>
            <p>Free delivery over £79</p>
          </div>
        </section>
      </div>

      <div className="border-t border-border">
        <div className="site-container flex flex-col gap-2 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} {siteConfig.footer.businessName}</p>
          <p>Secure checkout powered by Shopify</p>
        </div>
      </div>
    </footer>
  );
}
