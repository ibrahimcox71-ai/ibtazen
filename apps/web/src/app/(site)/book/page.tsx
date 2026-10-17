import type { Metadata } from "next";
import { CalendarCheck, Mail } from "lucide-react";
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
import { OG_IMAGE, SITE, breadcrumbSchema, webPageSchema } from "@ibtatech/config";
import { getBookingConfig } from "@/lib/booking";

export const metadata: Metadata = {
  title: "Book a Free Discovery Call",
  description:
    "Book a free 30-minute discovery call with Ibtatech. Discuss your website, app, email marketing or advertising goals — no obligation.",
  alternates: { canonical: "/book" },
  openGraph: {
    title: "Book a Free Discovery Call | Ibtatech",
    description: "A free 30-minute call to scope your project. No obligation.",
    url: "/book",
    images: [OG_IMAGE],
  },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "Book a call", href: "/book" },
];

export default function BookPage() {
  const booking = getBookingConfig();

  return (
    <>
      <JsonLd data={webPageSchema("/book", "Book a discovery call", metadata.description)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={CRUMBS} />
      </div>

      <PageHero
        eyebrow="Discovery call"
        title="Book a free 30-minute call"
        description="Talk directly with an engineer about your goals. You'll leave the call with a clear view of the options — whether or not you hire us."
        align="left"
      />

      <Section ariaLabel="Booking" tone="default">
        <div className="max-w-4xl gap-6 lg:grid-cols-[1.5fr_1fr] mx-auto grid">
          {booking.configured ? (
            <Card className="overflow-hidden">
              <iframe
                src={booking.url!}
                title={`Schedule a discovery call via ${booking.provider}`}
                className="h-[720px] w-full border-0"
                loading="lazy"
              />
            </Card>
          ) : (
            <Card tone="sunken">
              <CardHeader>
                <CardTitle as="h2" className="gap-2 text-base flex items-center">
                  <CalendarCheck aria-hidden className="size-5 text-accent" />
                  Online scheduling is being set up
                </CardTitle>
              </CardHeader>
              <CardContent className="gap-4 flex flex-col">
                <p className="text-sm text-text-secondary">
                  Our calendar integration isn&apos;t live yet — we&apos;re not going to pretend
                  otherwise. The fastest way to get your call booked right now:
                </p>
                <a
                  href={`mailto:${SITE.email}?subject=${encodeURIComponent("Discovery call request")}&body=${encodeURIComponent(
                    "Hi Ibtatech,\n\nI'd like to book a discovery call.\n\nA few times that work for me:\n1. \n2. \n3. \n\nWhat I'd like to discuss:\n- \n\nThanks,",
                  )}`}
                  className="min-h-11 gap-2 px-5 py-2.5 text-sm font-medium sm:w-auto inline-flex w-full items-center justify-center rounded-md bg-accent text-on-accent transition-colors hover:bg-accent-strong"
                >
                  <Mail aria-hidden className="size-4" />
                  Request times by email
                </a>
                <p className="text-sm text-text-secondary">
                  Or use the{" "}
                  <a
                    href="/contact"
                    className="font-medium text-accent underline-offset-4 hover:underline"
                  >
                    contact form
                  </a>{" "}
                  — we&apos;ll reply with suggested slots.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="gap-5 flex flex-col">
            <Card tone="sunken">
              <CardHeader>
                <CardTitle as="h2" className="text-base">
                  What to expect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="gap-3 text-sm flex flex-col text-text-secondary">
                  <li>30 minutes, video call — camera optional.</li>
                  <li>We listen first: your goals, constraints, timeline.</li>
                  <li>You get an honest read on scope and approach.</li>
                  <li>No sales scripts, no obligation.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
