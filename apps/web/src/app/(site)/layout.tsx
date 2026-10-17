import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ANALYTICS,
  ANALYTICS_SCRIPT_URL,
  FOOTER_LINK_GROUPS,
  NAV_LINKS,
  OG_IMAGE,
  SITE,
} from "@ibtatech/config";
import { getSiteSettings } from "@ibtatech/leads";
import { Footer, Header } from "@ibtatech/ui";
import { brandImageUrl } from "@/lib/brand-image";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Ibtatech — Web, Mobile, Email Automation & Paid Ads",
    template: "%s · Ibtatech",
  },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "Ibtatech — Web, Mobile, Email Automation & Paid Ads",
    description: SITE.description,
    url: SITE.url,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ibtatech — Web, Mobile, Email Automation & Paid Ads",
    description: SITE.description,
    images: [OG_IMAGE],
  },
};

/** Public marketing chrome — header, footer, skip target. Admin has its own shell. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  // The brand row is read per render (never throws): no uploaded logo simply
  // renders the text wordmark. The upload action revalidates this layout.
  const { logoPath } = await getSiteSettings();
  const logoUrl = brandImageUrl(logoPath);
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Motion paints its entrance state inline (opacity:0/translateY) — if JS never
          runs, those 30-odd elements would stay invisible to no-JS visitors and to
          non-rendering crawlers. This marks the document as scripted; the paired rule
          (hoisted to <head> via React 19 precedence) reveals every element whose
          entrance never resolved. With JS on, `.js` is set before the body parses, so
          the rule never fires and the animations run as designed. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.add("js")`,
        }}
      />
      <style
        href="motion-no-js-fallback"
        precedence="high"
        dangerouslySetInnerHTML={{
          __html:
            'html:not(.js) [style*="opacity:0"],html:not(.js) [style*="opacity: 0"]{opacity:1!important;transform:none!important}',
        }}
      />
      {/* Cookieless analytics — only loaded when a Plausible site is configured. */}
      {ANALYTICS_SCRIPT_URL ? (
        <script async src={ANALYTICS_SCRIPT_URL} data-domain={ANALYTICS.domain} />
      ) : null}
      <a
        href="#main-content"
        className="focus:left-4 focus:top-4 focus:px-4 focus:py-2 sr-only focus:not-sr-only focus:fixed focus:z-50 focus:rounded-md focus:bg-surface-inverted focus:text-text-on-inverted"
      >
        Skip to content
      </a>
      <Header nav={NAV_LINKS} logo={logoUrl ? { src: logoUrl } : null} />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer
        groups={FOOTER_LINK_GROUPS.map((group) => ({ ...group }))}
        copyright={`© ${new Date().getFullYear()} ${SITE.legalName}. All rights reserved.`}
        email={SITE.email}
      />
    </div>
  );
}
