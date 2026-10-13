import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-admin-layout className="min-h-[100dvh] bg-background text-foreground">
      {children}
    </div>
  );
}
