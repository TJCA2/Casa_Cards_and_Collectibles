import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casa Cards & Collectibles",
  description: "Sports cards and memorabilia — shop the collection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
