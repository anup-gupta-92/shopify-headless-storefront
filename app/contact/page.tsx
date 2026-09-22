import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import ContactForm from "@/components/ContactForm";
import { siteConfig } from "@/config/site";
import { createContactToken } from "@/lib/contact/security";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Send an enquiry to Apex Business Supplies.",
};

export default async function ContactPage() {
  // A fresh signed token is issued per request; do not prerender it into static HTML.
  await connection();
  const token = createContactToken();

  return <main className="min-h-[60vh] bg-background py-8 text-foreground sm:py-10">
    <div className="site-container">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted"><ol className="flex items-center gap-2"><li><Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Home</Link></li><li aria-hidden="true">&gt;</li><li aria-current="page">Contact</li></ol></nav>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] xl:gap-12">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">We&rsquo;re here to help</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Contact Us</h1>
          <p className="mt-4 max-w-2xl text-muted">Have a question about a product, an order, or working with us? Send us a message and we&rsquo;ll get back to you as soon as possible.</p>
          <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-8" aria-labelledby="contact-form-heading">
            <h2 id="contact-form-heading" className="text-2xl font-bold">Send an enquiry</h2>
            <p className="mt-2 text-sm text-muted">Fields marked * are required.</p>
            <ContactForm initialToken={token} />
          </section>
        </div>
        <aside className="min-w-0 rounded-2xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="contact-details-heading">
          <h2 id="contact-details-heading" className="text-xl font-bold">Contact details</h2>
          <p className="mt-4 text-sm text-muted">Prefer email? You can contact our team directly.</p>
          <a href={`mailto:${siteConfig.contact.email}`} className="mt-3 inline-block break-all rounded font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{siteConfig.contact.email}</a>
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="font-semibold">Help us help you</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">For order enquiries, include your order number. For product enquiries, a product name or link helps us identify the item.</p>
          </div>
        </aside>
      </div>
    </div>
  </main>;
}
