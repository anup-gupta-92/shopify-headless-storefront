import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShopifyRichText from "@/components/ShopifyRichText";
import { getShopPolicy, isPolicyHandle, POLICY_HANDLES, policyDescription } from "@/lib/shopify/policies";

interface PolicyPageProps {
  params: Promise<{ handle: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return POLICY_HANDLES.map((handle) => ({ handle }));
}

async function resolvePolicy(handle: string) {
  if (!isPolicyHandle(handle)) notFound();
  const policy = await getShopPolicy(handle);
  if (!policy) notFound();
  return policy;
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const { handle } = await params;
  const policy = await resolvePolicy(handle);

  return {
    title: policy.title,
    description: policyDescription(policy),
    alternates: {
      canonical: `/policies/${encodeURIComponent(handle)}`,
    },
  };
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { handle } = await params;
  const policy = await resolvePolicy(handle);

  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:py-10">
      <div className="site-container">
        <div className="mx-auto max-w-4xl">
          <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link
                  href="/"
                  className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">&gt;</li>
              <li aria-current="page">{policy.title}</li>
            </ol>
          </nav>

          <article>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Store policy</p>
            <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">
              {policy.title}
            </h1>
            <div className="mt-8 rounded-xl border border-border bg-surface px-5 py-6 sm:px-8 sm:py-8">
              <ShopifyRichText html={policy.body} text="" />
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
