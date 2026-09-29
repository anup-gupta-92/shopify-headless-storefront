import type { Metadata } from "next";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased">
        <ThemeProvider>
          <CookieConsentProvider>
            <GoogleAnalytics />
            <CartProvider>
              <Navbar />
              <div className="flex-grow">{children}</div>
              <Footer />
              <CartDrawer />
            </CartProvider>
          </CookieConsentProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
