import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { TabBar } from "@/components/TabBar";
import { Wiz } from "@/components/Wiz";
import { ToastProvider } from "@/components/ToastProvider";
import { Onboarding } from "@/components/Onboarding";
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

// Applies a saved theme choice before first paint, so there's no flash of
// the wrong theme. Runs before hydration and never touches an attribute
// React itself renders, so it can't cause a hydration mismatch.
const noFlashThemeScript = `(function(){try{var t=localStorage.getItem('buywise_theme_v1');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider>
          <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-2 pressable">
                <Wiz pose="head" size={30} priority />
                <span className="text-[15px] font-bold tracking-tight">BuyWise</span>
              </Link>
              <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted">
                Demo data
              </span>
            </div>
          </header>
          <div className="flex-1 pb-24">{children}</div>
          <TabBar />
          <Onboarding />
        </ToastProvider>
      </body>
    </html>
  );
}
