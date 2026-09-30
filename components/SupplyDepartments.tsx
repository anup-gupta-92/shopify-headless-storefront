import Image from "next/image";
import Link from "next/link";

const departments = [
  { title: "PPE Gear", copy: "Masks, gloves and workplace protection essentials.", image: "/images/home/ppe-gear.jpg", href: "/collections/safety-gear" },
  { title: "Packaging Supplies", copy: "Mailing bags, boxes, tapes and shipping essentials.", image: "/images/home/packaging-supplies.jpg", href: "/collections/packaging-supplies" },
  { title: "Abrasives", copy: "Professional sanding, preparation and finishing products.", image: "/images/home/abrasives.jpg", href: "/collections/abrasives" },
  { title: "Surface Protection & Cleaning", copy: "Cloths, waxes, cleaning and surface-protection essentials.", image: "/images/home/surface-protection-cleaning.jpg", href: "/collections/protection-cleaning" },
] as const;

interface SupplyDepartmentsProps {
  heading: string;
  description: string;
  headingId: string;
  spacing?: "default" | "compact";
}

export default function SupplyDepartments({
  heading,
  description,
  headingId,
  spacing = "default",
}: SupplyDepartmentsProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={spacing === "compact"
        ? "mt-8 border-t border-border pt-8 sm:mt-10 sm:pt-10"
        : "mt-14 border-t border-border pt-12 sm:mt-16 sm:pt-14"}
    >
      <div className="max-w-3xl">
        <h2 id={headingId} className="text-3xl font-extrabold tracking-tight sm:text-4xl">{heading}</h2>
        <p className="mt-3 leading-7 text-muted">{description}</p>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {departments.map((department) => (
          <Link key={department.href} href={department.href} className="group overflow-hidden rounded-xl border border-border bg-surface transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none">
            <span className="relative block aspect-square overflow-hidden bg-surface-muted">
              <Image src={department.image} alt={`${department.title} supplies`} fill sizes="(max-width: 1023px) calc((100vw - 3rem) / 2), (max-width: 1599px) calc((100vw - 6rem) / 4), 420px" className="object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none" />
            </span>
            <span className="block p-3 sm:p-4">
              <span className="block font-bold text-foreground sm:text-lg">{department.title}</span>
              <span className="mt-1.5 block text-xs leading-5 text-muted sm:text-sm">{department.copy}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
