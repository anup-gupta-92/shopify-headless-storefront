import Image from "next/image";
import Link from "next/link";

const credibilityPoints = [
  {
    icon: "uk",
    title: "UK-based business supplier",
  },
  {
    icon: "range",
    title: "Packaging, PPE, abrasives and cleaning in one place",
  },
  {
    icon: "dispatch",
    title: "Fast dispatch and bulk-order capability",
  },
] as const;

function CredibilityIcon({ name }: { name: string }) {
  const commonProps = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "range") {
    return <svg {...commonProps}><path d="m4 7 8-4 8 4-8 4z" /><path d="m4 12 8 4 8-4" /><path d="m4 17 8 4 8-4" /></svg>;
  }

  if (name === "dispatch") {
    return <svg {...commonProps}><path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
  }

  return <svg {...commonProps}><path d="M12 21s7-3.5 7-10V5l-7-2-7 2v6c0 6.5 7 10 7 10Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

export default function HomepageAboutSection() {
  return (
    <section aria-labelledby="about-apex-heading" className="mt-14 border-t border-border pt-12 sm:mt-16 sm:pt-14">
      <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10 xl:gap-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">About Apex</p>
          <h2 id="about-apex-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Business supplies that keep everyday operations moving
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-muted">
            Apex Business Supplies provides packaging, PPE, abrasives, cleaning and workplace essentials to businesses across the UK, with a focus on practical products, reliable supply and straightforward ordering.
          </p>

          <ul className="mt-7 space-y-4">
            {credibilityPoints.map((point) => (
              <li key={point.title} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CredibilityIcon name={point.icon} />
                </span>
                <span className="font-semibold text-foreground">{point.title}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/about"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-sm:w-full"
          >
            Learn More About Apex
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <Image
            src="/images/home/about-home.jpg"
            alt="Apex business supplies in use across packaging and workplace operations"
            width={1150}
            height={1150}
            sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1439px) calc(50vw - 2.75rem), 720px"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
