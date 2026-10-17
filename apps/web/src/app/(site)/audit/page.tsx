import type { Metadata } from "next";
import { Search, ShieldCheck, UserCheck } from "lucide-react";
import {
  Breadcrumbs,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  JsonLd,
  PageHero,
  Section,
} from "@ibtatech/ui";
import { OG_IMAGE, breadcrumbSchema, webPageSchema } from "@ibtatech/config";
import { AuditForm } from "./audit-form";

export const metadata: Metadata = {
  title: "Free Website, SEO & Ad Account Audit",
  description:
    "Request a free manual audit of your website, SEO or paid ad account. A senior specialist reviews your live site or campaign and replies with findings and next steps.",
  alternates: { canonical: "/audit" },
  openGraph: {
    title: "Free Website, SEO & Ad Account Audit | Ibtatech",
    description:
      "A senior specialist manually reviews your website, SEO or ad account and replies with concrete findings.",
    url: "/audit",
    images: [OG_IMAGE],
  },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "Free audit", href: "/audit" },
];

export default function AuditPage() {
  return (
    <>
      <JsonLd data={webPageSchema("/audit", "Free audit", metadata.description)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={CRUMBS} />
      </div>

      <PageHero
        eyebrow="Free audit"
        title="Get a specialist's read on your website, SEO or ads"
        description="Tell us where to look. A senior specialist reviews it manually and replies with what's working, what isn't, and what we'd do next — whether or not you hire us."
        align="left"
      />

      <Section ariaLabel="Audit request form" tone="default">
        <div className="gap-10 lg:grid-cols-[1.5fr_1fr] grid">
          <Card className="p-6 sm:p-8">
            <AuditForm />
          </Card>

          <div className="gap-5 flex flex-col">
            <Card tone="sunken">
              <CardHeader>
                <CardTitle as="h2" className="text-base">
                  What you get
                </CardTitle>
              </CardHeader>
              <CardContent className="gap-4 flex flex-col">
                {[
                  {
                    icon: Search,
                    title: "A human review",
                    body: "Your site or campaign is examined by a specialist — not an automated report generator.",
                  },
                  {
                    icon: UserCheck,
                    title: "Concrete findings",
                    body: "Specific issues and opportunities, prioritised by impact, in plain language.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "No obligation",
                    body: "You keep the findings even if we never work together. No credentials required.",
                  },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} className="gap-3 flex items-start">
                    <span className="size-9 flex shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text">{title}</p>
                      <p className="text-sm text-text-secondary">{body}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
