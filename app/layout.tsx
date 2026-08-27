import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuyWise — Know before you buy",
  description:
    "Paste a product or search for one and get a clear BUY NOW / WAIT / DON'T BUY recommendation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border px-6 py-4">
          <Link href="/" className="text-sm font-bold tracking-tight">
            BuyWise
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
