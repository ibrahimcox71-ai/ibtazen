import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, Globe, Shield, Users, type LucideIcon } from "lucide-react";
import {
  CARD_GAP,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ButtonLink,
  CTASection,
  FaqAccordion,
  PageHero,
  ProcessSteps,
  Reveal,
  SECTION_GAP,
  Section,
  SectionHeader,
  StaggerGroup,
  StaggerItem,
  JsonLd,
  cn,
  focusRing,
} from "@ibtatech/ui";
import { CapabilityGrid } from "@ibtatech/ui/capability-grid";
import {
  DISCUSS_WORK_CTA,
  ENGAGEMENT_PROCESS,
  FAQ_CONTACT,
  GLOBAL_FAQS,
  PRIMARY_CTA,
  TECH_STACK_GROUPS,
  MEASUREMENT_TOOLS,
  organizationSchema,
  websiteSchema,
} from "@ibtatech/config";
import { POSITIONING_FACTS, CLIENT_TYPES } from "@ibtatech/config";
import {
  caseStudyGridClass,
  loadHomeCaseStudies,
  planHomeCaseStudies,
} from "@/lib/home-case-studies";
import { SelectedWorkCard } from "@/components/selected-work";
import { ServiceCards } from "@/components/service-cards";
import { HomeProductVisual } from "@/components/home-product-visual";
import { listPublishedTeamMembers } from "@ibtatech/leads";
import { teamImageUrl } from "@/lib/team-image";

/** Case studies are edited in the CRM — re-render the landing page shortly after. */
export const revalidate = 60;

/**
 * Decorative glyphs keyed to config copy. Icons are aria-hidden — the title
 * next to them is the accessible name — and every glyph is a neutral concept,
 * never a brand or client mark.
 */
const TRUST_ICONS: Record<string, LucideIcon> = {
  "UK & EU delivery": Globe,
  "Senior engineers only": Users,
  "Measured, not promised": BarChart3,
};

const TRUST_GRID_COLUMNS = [
  "lg:grid-cols-1",
  "lg:grid-cols-2",
  "lg:grid-cols-3",
  "lg:grid-cols-4",
] as const;

export default async function HomePage() {
  // Fail-soft: a failed read yields [], which the plan turns into "hide the
  // section". Real case studies are the single biggest credibility lever on
  // this page — but with nothing published the section does not render at all.
  const studies = await loadHomeCaseStudies();
  const plan = planHomeCaseStudies(studies);
  const [featured] = studies;
  const teamMembers = await listPublishedTeamMembers();
  const trustFacts = POSITIONING_FACTS.filter((fact) => fact.title !== "You own everything");
  const trustGridColumns =
    TRUST_GRID_COLUMNS[Math.min(trustFacts.length, TRUST_GRID_COLUMNS.length) - 1] ??
    "lg:grid-cols-1";

  return (
    <>
      <JsonLd
        data={organizationSchema(
          teamMembers.map((member) => ({
            name: member.name,
            role: member.role,
            bio: member.bio,
            photoUrl: teamImageUrl(member.photoUrl) ?? "",
            linkedinUrl: member.linkedinUrl,
          })),
        )}
      />
      <JsonLd data={websiteSchema()} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <PageHero
        className="home-hero"
        eyebrow="UK · Europe · Worldwide"
        title="Build the digital systems that turn attention into growth."
        description="Ibtatech builds high-performance websites, web applications, Android & iOS apps, automated customer journeys, and performance-driven advertising systems for ambitious businesses."
        primaryCta={PRIMARY_CTA}
        secondaryCta={{ label: "Explore Our Services", href: "/services" }}
        afterCta={<HomeProductVisual />}
      />

      {/* ── Positioning facts ────────────────────────────────────────────── */}
      <Section tone="sunken" ariaLabel="How we work" underHero>
        <StaggerGroup className={cn(CARD_GAP, "sm:grid-cols-2 grid", trustGridColumns)}>
          {trustFacts.map((fact) => {
            const Icon = TRUST_ICONS[fact.title] ?? Shield;
            return (
              <StaggerItem key={fact.title} className="h-full">
                <Card className="gap-3 p-6 ease-out hover:-translate-y-0.5 flex h-full flex-col transition-[border-color,box-shadow,transform] duration-200 hover:border-accent/50 hover:shadow-md">
                  <span className="size-10 flex items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon aria-hidden className="size-5" strokeWidth={2} />
                  </span>
                  <h2 className="font-card-title text-card-title text-text">{fact.title}</h2>
                  <p className="text-body text-text-secondary">{fact.description}</p>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </Section>

      {/* ── Four pillars ─────────────────────────────────────────────────── */}
      <Section ariaLabel="Services">
        <SectionHeader
          eyebrow="Services"
          title="Four disciplines. One accountable team."
          description="Strategy, engineering and growth under one roof — so nothing gets lost between agencies."
        />
        <ServiceCards copy="tagline" />
      </Section>

      {/* ── Capabilities ─────────────────────────────────────────────────── */}
      <Section tone="sunken" ariaLabel="Technology capabilities">
        <SectionHeader
          eyebrow="Capabilities"
          title="Engineering depth across the stack"
          description="We choose technology per project — never per fashion cycle. These are the tools we build with day to day."
        />
        <div className={SECTION_GAP}>
          <CapabilityGrid groups={TECH_STACK_GROUPS.map((group) => ({ ...group }))} />
        </div>
        <p className="mt-4 text-sm text-text-muted">
          All trademarks belong to their respective owners. Logos shown only to indicate
          technologies we work with.
        </p>
      </Section>

      {/* ── Process ──────────────────────────────────────────────────────── */}
      <Section ariaLabel="How projects run">
        <SectionHeader
          eyebrow="How we work"
          title="From first call to measured launch"
          description="One process across every service — transparent and free of surprise invoices."
        />
        <div className={SECTION_GAP}>
          <ProcessSteps steps={ENGAGEMENT_PROCESS.map((step) => ({ ...step }))} />
        </div>
        <div className="mt-8 gap-x-8 gap-y-5 sm:grid-cols-2 pt-5 grid border-t border-border-subtle">
          <div className="gap-1 flex flex-col">
            <h3 className="font-card-title text-card-title text-text">One business day</h3>
            <p className="text-body text-text-secondary">
              We aim to reply to new enquiries within one business day.
            </p>
          </div>
          <div className="gap-1 flex flex-col">
            <h3 className="font-card-title text-card-title text-text">You own the code</h3>
            <p className="text-body text-text-secondary">
              Code, accounts and data are yours. Handover includes source, access, deployment notes
              and documentation.
            </p>
          </div>
        </div>
        <div className="mt-8 gap-4 sm:flex-row sm:items-center sm:justify-between pt-6 flex flex-col border-t border-border-subtle">
          <p className="text-body text-text-secondary">
            Start with a free 30-minute discovery call.
          </p>
          <ButtonLink href={PRIMARY_CTA.href} size="md" className="sm:w-auto w-full">
            Book a Free Discovery Call
          </ButtonLink>
        </div>
      </Section>

      {/* ── Client types ─────────────────────────────────────────────────── */}
      <Section tone="sunken" ariaLabel="Audience segments">
        <SectionHeader
          eyebrow="Who this is for"
          title="Teams we build for"
          description="From first product to scale-up systems — sized and staffed accordingly."
        />
        <StaggerGroup className={cn(SECTION_GAP, CARD_GAP, "sm:grid-cols-2 lg:grid-cols-4 grid")}>
          {CLIENT_TYPES.map((client) => (
            <StaggerItem key={client.title} className="h-full">
              <Card className="flex h-full flex-col">
                {/* pb-6 restores the card's bottom padding: the header is the only
                    block, and its default pb-0 left the last line flush to the edge. */}
                <CardHeader className="pb-6 flex-1">
                  <CardTitle>{client.title}</CardTitle>
                  <CardDescription>{client.description}</CardDescription>
                </CardHeader>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* ── Selected work — rendered only while a real case study exists ─── */}
      {plan.mode === "grid" && (
        <Section ariaLabel="Selected work" tone="sunken">
          <div className="gap-10 lg:grid-cols-2 grid items-start">
            <Reveal className="gap-4 flex flex-col">
              <p className="text-sm font-semibold tracking-[0.14em] text-accent uppercase">
                Selected work
              </p>
              <h2 className="font-display text-headline">Work with client-approved results</h2>
              <p className="max-w-xl text-text-secondary">
                {featured ? (
                  <>{featured.clientName} is featured here. </>
                ) : (
                  <>Published case studies appear here. </>
                )}
                Everything else stays private until the numbers are client-approved and
                independently checkable — on a discovery call we&apos;ll walk you through the
                relevant systems we&apos;ve built.
              </p>
              <div className="gap-5 flex flex-wrap items-center">
                <Link
                  href="/case-studies"
                  className={cn(
                    "min-h-11 gap-2 text-sm font-medium inline-flex items-center text-accent",
                    focusRing,
                  )}
                >
                  Browse all case studies
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href={PRIMARY_CTA.href}
                  className={cn(
                    "min-h-11 gap-2 text-sm font-medium inline-flex items-center text-accent",
                    focusRing,
                  )}
                >
                  {DISCUSS_WORK_CTA}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </Reveal>
            <StaggerGroup className={caseStudyGridClass(plan.studies.length)}>
              {plan.studies.map((study) => (
                <StaggerItem key={study.id} className="h-full">
                  <SelectedWorkCard study={study} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </Section>
      )}

      <Section tone="sunken" ariaLabel="How we measure results">
        <SectionHeader
          eyebrow="Measurement"
          title="Agree the measure before the work starts"
          description="We set a baseline, choose KPIs with your team, then review progress on an agreed cadence. Tools depend on your channels and existing setup."
        />
        <div
          className={cn(
            SECTION_GAP,
            "overflow-hidden rounded-xl border border-border-default bg-surface-raised",
          )}
        >
          <table className="measurement-table w-full text-left text-body text-text-secondary">
            <caption className="sr-only">Measurement tools, tracked signals and reporting</caption>
            <thead className="text-sm font-semibold text-text">
              <tr>
                <th scope="col">Tool</th>
                <th scope="col">We track</th>
                <th scope="col">We report</th>
              </tr>
            </thead>
            <tbody>
              {MEASUREMENT_TOOLS.map((tool) => (
                <tr key={tool.id}>
                  <th data-label="Tool" scope="row">
                    {tool.name}
                  </th>
                  <td data-label="We track">{tool.track}</td>
                  <td data-label="We report">{tool.report}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {teamMembers.length > 0 && (
        <Section ariaLabel="Meet the team">
          <SectionHeader eyebrow="People" title="The people behind the work" />
          <div className={cn(SECTION_GAP, CARD_GAP, "sm:grid-cols-2 lg:grid-cols-3 grid")}>
            {teamMembers.map((member) => {
              const src = teamImageUrl(member.photoUrl);
              if (!src) return null;
              return (
                <Card key={member.id} className="gap-4 p-4 flex h-full flex-col">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-sunken">
                    <Image
                      src={src}
                      alt={`${member.name}, ${member.role} of Ibtatech`}
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold tracking-wider text-accent uppercase">
                      {member.role}
                    </p>
                    <h3 className="mt-2 font-card-title text-card-title">{member.name}</h3>
                    {member.bio && (
                      <p className="mt-2 leading-relaxed text-body text-text-secondary">
                        {member.bio}
                      </p>
                    )}
                    {member.linkedinUrl && (
                      <a
                        href={member.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${member.name} on LinkedIn`}
                        className={cn(
                          "mt-4 min-h-11 text-sm font-medium inline-flex items-center text-accent",
                          focusRing,
                        )}
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <Section tone="sunken" ariaLabel="Frequently asked questions">
        <div className="gap-10 lg:grid-cols-[1fr_1.4fr] grid">
          {/* Sticky on desktop: the offer to talk stays in view while the long list scrolls. */}
          <div className="gap-6 lg:sticky lg:top-24 lg:self-start flex flex-col">
            <SectionHeader
              align="left"
              eyebrow="FAQ"
              title="Answers, before you ask"
              description="The questions most clients bring to the first call."
            />
            <Card className="gap-4 p-6">
              <p className="font-medium text-text">{FAQ_CONTACT.text}</p>
              <ButtonLink href={PRIMARY_CTA.href} className="sm:w-auto w-full">
                {FAQ_CONTACT.button}
              </ButtonLink>
            </Card>
          </div>
          <div>
            <FaqAccordion items={GLOBAL_FAQS.slice(0, 5).map((faq) => ({ ...faq }))} />
            <Link
              href="/faq"
              className={cn(
                "mt-4 min-h-11 gap-2 text-sm font-medium inline-flex items-center text-accent",
                focusRing,
              )}
            >
              Read the full FAQ
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <CTASection
        title="Have a project in mind?"
        description="Tell us where you want the business to go. We'll map the shortest technical route."
        primaryLabel={PRIMARY_CTA.label}
        primaryHref={PRIMARY_CTA.href}
        secondaryLabel="Get a Project Estimate"
        secondaryHref="/contact"
      />
    </>
  );
}
