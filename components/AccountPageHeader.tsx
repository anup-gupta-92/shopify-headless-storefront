import Link from "next/link";

export default function AccountPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header>
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">Home</Link></li>
          <li aria-hidden="true">&gt;</li>
          <li><Link href="/account" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">Account</Link></li>
          {title !== "My Account" && <><li aria-hidden="true">&gt;</li><li aria-current="page">{title}</li></>}
        </ol>
      </nav>
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Customer account</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-muted">{description}</p>}
    </header>
  );
}
