import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import CartProvider from "@/components/CartProvider";
import ThemeProvider from "@/components/ThemeProvider";
import CookieConsentProvider from "@/components/CookieConsentProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { siteConfig } from "@/config/site";
import JsonLd from "@/components/JsonLd";
import { buildGlobalStructuredData } from "@/lib/structured-data";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const vercelAnalyticsEnabled = process.env.VERCEL === "1";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Apex Business Supplies | Packaging, PPE, Abrasives & Business Supplies",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  icons: {
    icon: { url: "/images/favicon.png", type: "image/png", sizes: "192x192" },
    apple: { url: "/images/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.shortName,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: siteConfig.theme.primary },
    { media: "(prefers-color-scheme: dark)", color: siteConfig.theme.darkBackground },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased">
        <JsonLd id="site-structured-data" data={buildGlobalStructuredData()} />
        <ThemeProvider>
          <CookieConsentProvider>
            <GoogleAnalytics />
            <CartProvider>
              <Navbar />
              <div className="flex-grow">{children}</div>
              <Footer />
              <CartDrawer />
              <PwaInstallPrompt />
            </CartProvider>
          </CookieConsentProvider>
        </ThemeProvider>
        {vercelAnalyticsEnabled ? <Analytics /> : null}
      </body>
    </html>
  );
}
