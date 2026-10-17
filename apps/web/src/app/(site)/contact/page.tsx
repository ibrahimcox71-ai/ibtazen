import type { Metadata } from "next";
import { Clock, Mail, ShieldCheck } from "lucide-react";
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
import { OG_IMAGE, PRIMARY_CTA, SITE, breadcrumbSchema, webPageSchema } from "@ibtatech/config";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact — Start Your Project",
  description:
    "Tell Ibtatech what you're building. Senior engineers reply within one business day — or book a free discovery call directly.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact — Start Your Project | Ibtatech",
    description: "Tell us what you're building. A senior engineer replies within one business day.",
    url: "/contact",
    images: [OG_IMAGE],
  },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "Contact", href: "/contact" },
];

const ASSURANCES = [
  {
    icon: Clock,
    title: "One business day",
    description: "A senior engineer replies — not an autoresponder.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    description: "Used only to answer your enquiry. No marketing lists.",
  },
  {
    icon: Mail,
    title: "No obligation",
    description: "You get a written plan even if we never work together.",
  },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={webPageSchema("/contact", "Contact", metadata.description)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={CRUMBS} />
      </div>

      <PageHero
        eyebrow="Contact"
        title="Tell us what you're building"
        description="The more context you give, the more specific our first reply will be. Every enquiry is read by an engineer."
        align="left"
      />

      <Section ariaLabel="Contact form" tone="default">
        <div className="gap-10 lg:grid-cols-[1.5fr_1fr] grid">
          <Card className="p-6 sm:p-8">
            <ContactForm />
          </Card>

          <div className="gap-5 flex flex-col">
            <Card tone="sunken">
              <CardHeader>
                <CardTitle as="h2" className="text-base">
                  Faster route
                </CardTitle>
              </CardHeader>
              <CardContent className="gap-3 flex flex-col">
                <p className="text-sm text-text-secondary">
                  Skip the back-and-forth — book a free 30-minute discovery call directly.
                </p>
                <a
                  href={PRIMARY_CTA.href}
                  className="min-h-11 px-5 py-2.5 text-sm font-medium inline-flex items-center justify-center rounded-md bg-accent text-on-accent transition-colors hover:bg-accent-strong"
                >
                  {PRIMARY_CTA.label}
                </a>
              </CardContent>
            </Card>

            <Card tone="sunken">
              <CardHeader>
                <CardTitle as="h2" className="text-base">
                  Prefer email?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={`mailto:${SITE.email}`}
                  className="min-h-11 gap-2 text-sm font-medium inline-flex items-center text-accent"
                >
                  <Mail aria-hidden className="size-4" />
                  {SITE.email}
                </a>
              </CardContent>
            </Card>

            <ul className="gap-4 flex flex-col" aria-label="What happens next">
              {ASSURANCES.map(({ icon: Icon, title, description }) => (
                <li key={title} className="gap-3 flex items-start">
                  <span className="size-9 flex shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text">{title}</p>
                    <p className="text-sm text-text-secondary">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
