import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import {
  MOTION_FALLBACK_SCRIPT,
  MotionConfigProvider,
  ThemeProvider,
  THEME_BOOTSTRAP_SCRIPT,
} from "@ibtatech/ui";
import { FAVICON_ROUTE } from "@/lib/brand-image";
import "./globals.css";
import "@ibtatech/ui/tokens.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ibtatech — Web, Mobile, Email Automation & Paid Ads",
    template: "%s · Ibtatech",
  },
  description:
    "Ibtatech builds high-performance websites, web applications, Android & iOS apps, automated customer journeys, and performance-driven advertising systems for ambitious businesses.",
  /**
   * Declared at the root so every segment (site, admin, portal) gets a favicon.
   * This is a stable alias, not a file: it serves the uploaded favicon and
   * falls back to /favicon.svg, because metadata is baked at build time and
   * cannot know the key of an upload that happens later.
   */
  icons: { icon: [{ url: FAVICON_ROUTE }] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#080b10" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: MOTION_FALLBACK_SCRIPT }} />
        {/*
          Scripting off entirely: the SSR markup ships with inline opacity:0 and
          no script can lift it, so the same reveal runs from CSS instead.
        */}
        <noscript>
          <style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <MotionConfigProvider>{children}</MotionConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
