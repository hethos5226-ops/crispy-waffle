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
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[13px] font-bold text-background">
                B
              </span>
              <span className="text-[15px] font-bold tracking-tight">BuyWise</span>
            </Link>
            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted">
              Demo data
            </span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
