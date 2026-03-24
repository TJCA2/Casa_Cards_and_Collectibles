import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SearchShortcut from "@/components/layout/SearchShortcut";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/cart/CartDrawer";
import Providers from "@/components/layout/Providers";
import CookieConsent from "@/components/CookieConsent";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  title: {
    default: "Casa Cards & Collectibles",
    template: "%s | Casa Cards & Collectibles",
  },
  description:
    "Your source for sports cards & collectibles — baseball, basketball, football, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-gray-900 antialiased">
        <GoogleAnalytics />
        <Providers>
          <CartProvider>
            <SearchShortcut />
            <Header />
            <CartDrawer />
            <main className="flex-1">{children}</main>
            <Footer />
            <CookieConsent />
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
