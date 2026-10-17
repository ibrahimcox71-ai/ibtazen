import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  isPublishableFounder,
  MEASUREMENT_TOOLS,
  organizationSchema,
  renderLlmsTxt,
  ENGAGEMENT_PROCESS,
  type FounderProfile,
} from "@ibtatech/config";

const completeFounder: FounderProfile = {
  name: "A verified founder",
  role: "Founder",
  bio: "A real one-line biography supplied by the company.",
  photo: { src: "/founder.jpg", alt: "Founder portrait" },
  links: [{ label: "Professional profile", href: "https://example.com/profile" }],
};

describe("homepage People section publishing guard", () => {
  it("hides the section when the profile is empty", () => {
    expect(isPublishableFounder(undefined)).toBe(false);
  });

  it("hides placeholder and incomplete profiles", () => {
    expect(
      isPublishableFounder({
        name: "[Founder name]",
        role: "[Role]",
        bio: "TODO: add a short introduction",
        photo: { src: "[photo URL]", alt: "[photo alt]" },
      }),
    ).toBe(false);
    expect(isPublishableFounder({ name: "A real name", role: "Founder" })).toBe(false);
  });

  it("shows the section when real identity and a real photo or bio are supplied", () => {
    expect(isPublishableFounder(completeFounder)).toBe(true);
    expect(
      isPublishableFounder({ name: "A verified founder", role: "Founder", bio: "A real bio." }),
    ).toBe(true);
    expect(
      isPublishableFounder({
        name: "A verified founder",
        role: "Founder",
        photo: { src: "/founder.jpg", alt: "Portrait" },
      }),
    ).toBe(true);
  });

  it("omits invalid optional placeholder data even when another field is complete", () => {
    expect(
      isPublishableFounder({
        name: "A verified founder",
        role: "Founder",
        bio: "[Add bio]",
        photo: { src: "/founder.jpg", alt: "Portrait" },
      }),
    ).toBe(false);
  });

  it("adds only complete published database members to Organization Person JSON-LD", () => {
    expect(organizationSchema([])).not.toHaveProperty("founder");
    expect(
      organizationSchema([{ name: "Ibrahim Khan", role: "Founder", photoUrl: "" }]),
    ).not.toHaveProperty("founder");
    expect(
      organizationSchema([
        {
          name: "Ibrahim Khan",
          role: "Founder",
          photoUrl: "/api/uploads/team/founder.jpg",
          linkedinUrl: "https://www.linkedin.com/in/imibrahimkhan/",
        },
      ]),
    ).toMatchObject({
      founder: {
        "@type": "Person",
        name: "Ibrahim Khan",
        sameAs: ["https://www.linkedin.com/in/imibrahimkhan/"],
      },
    });
    expect(
      organizationSchema([{ name: "Real teammate", role: "Engineer", photoUrl: "/member.webp" }]),
    ).toMatchObject({
      employee: { "@type": "Person", name: "Real teammate" },
    });
  });
});

describe("measurement tools single source", () => {
  it("publishes the same tracking and reporting facts to llms.txt and Organization schema", () => {
    const llms = renderLlmsTxt();
    const schema = organizationSchema();
    const schemaKnowledge = schema.knowsAbout.join(" ");

    for (const tool of MEASUREMENT_TOOLS) {
      expect(llms).toContain(`${tool.name}** — We track ${tool.track} We report ${tool.report}`);
      expect(schemaKnowledge).toContain(tool.track);
      expect(schemaKnowledge).toContain(tool.report);
    }
  });

  it("renders measurement as a labelled semantic table and keeps commitments readable", () => {
    const homepage = readFileSync(new URL("../src/app/(site)/page.tsx", import.meta.url), "utf8");

    expect(homepage).toContain('<table className="measurement-table');
    expect(homepage).toContain('<th scope="col">Tool</th>');
    expect(homepage).toContain('<th scope="col">We track</th>');
    expect(homepage).toContain('<th scope="col">We report</th>');
    expect(homepage).toContain('<th data-label="Tool" scope="row">');
    expect(homepage).toContain('<td data-label="We track">');
    expect(homepage).toContain('<td data-label="We report">');
    expect(homepage).toContain(
      '<h3 className="font-card-title text-card-title text-text">One business day</h3>',
    );
    expect(homepage).toContain(
      '<h3 className="font-card-title text-card-title text-text">You own the code</h3>',
    );
  });
});

describe("homepage typography and repeated messaging", () => {
  const homepage = readFileSync(new URL("../src/app/(site)/page.tsx", import.meta.url), "utf8");
  const tokens = readFileSync(new URL("../../../packages/ui/tokens.css", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const siteContent = readFileSync(
    new URL("../../../packages/config/site-content.ts", import.meta.url),
    "utf8",
  );
  const faqs = readFileSync(new URL("../../../packages/config/faqs.ts", import.meta.url), "utf8");

  it("keeps the section heading scale tighter and visibly above a shared card-title token", () => {
    expect(tokens).toContain("--text-headline: clamp(1.3125rem, 2.2vw + 0.25rem, 2.5rem);");
    expect(tokens).toContain("--text-hero: clamp(2rem, 3.333vw + 0.5rem, 3.5rem);");
    expect(styles).toContain(".home-hero h1");
    expect(styles).toContain("font-size: var(--text-hero);");
    expect(tokens).toContain("--font-card-title: var(--font-sans);");
    expect(tokens).toContain("--text-card-title--font-weight: 600;");
    expect(homepage).toContain("font-card-title text-card-title");
  });

  it("puts one primary discovery-call CTA after the process commitments", () => {
    const commitments = homepage.indexOf(">You own the code</h3>");
    const cta = homepage.indexOf("Book a Free Discovery Call", commitments);
    const audience = homepage.indexOf('ariaLabel="Audience segments"');

    expect(commitments).toBeGreaterThan(-1);
    expect(cta).toBeGreaterThan(commitments);
    expect(cta).toBeLessThan(audience);
  });

  it("keeps mobile header CTA visible and balances capability chip rows", () => {
    const header = readFileSync(
      new URL("../../../packages/ui/src/components/header.tsx", import.meta.url),
      "utf8",
    );
    const featureGrid = readFileSync(
      new URL("../../../packages/ui/src/sections/capability-grid.tsx", import.meta.url),
      "utf8",
    );

    expect(header).toContain('"top-0 sticky z-40');
    expect(header).toContain('<span className="sm:hidden">Book a call</span>');
    expect(featureGrid).toContain('<ul className="gap-2 grid grid-cols-2">');
    expect(featureGrid).toContain("text-[13px]");
    expect(featureGrid).toContain('className="size-4 shrink-0"');
  });

  it("uses official brand marks when available and neutral fallbacks otherwise", () => {
    const capabilityGrid = readFileSync(
      new URL("../../../packages/ui/src/sections/capability-grid.tsx", import.meta.url),
      "utf8",
    );

    expect(capabilityGrid).toContain("iOS: { icon: siApple");
    expect(capabilityGrid).toContain('"React Native": Smartphone');
    expect(capabilityGrid).toContain("AWS: Cloud");
    expect(capabilityGrid).toContain("Klaviyo: Mail");
    expect(capabilityGrid).toContain('"Customer.io": Workflow');
    expect(capabilityGrid).toContain('darkColor: "currentColor"');
    expect(capabilityGrid).not.toContain('"use client"');
    expect(styles).toContain("@custom-variant dark (&:where(.dark, .dark *));");
  });

  it("uses one stretched, accessibly named service link per card", () => {
    const serviceCards = readFileSync(
      new URL("../src/components/service-cards.tsx", import.meta.url),
      "utf8",
    );

    expect(serviceCards.match(/<Link\b/g)).toHaveLength(1);
    expect(serviceCards).toContain("aria-label={`Explore ${service.name}`}");
    expect(serviceCards).toContain("after:inset-0 after:absolute");
    expect(serviceCards).toContain("service.capabilities.slice(0, 2)");
    expect(serviceCards).toContain('aria-hidden="true"');
    expect(serviceCards).not.toContain("Learn more");
  });

  it("renders the trademarks notice after the capabilities grid", () => {
    const note = homepage.indexOf("All trademarks belong to their respective owners.");
    const process = homepage.indexOf('ariaLabel="How projects run"');

    expect(note).toBeGreaterThan(-1);
    expect(note).toBeLessThan(process);
    expect(homepage).toContain("Logos shown only to indicate");
  });

  it("enforces 16px body, card descriptions and measurement cells", () => {
    expect(tokens).toContain("--text-body: 1rem;");
    expect(tokens).toContain("--text-card-description: 1rem;");
    expect(styles).toContain("font-size: var(--text-body);");
    expect(homepage).toContain(
      'className="measurement-table w-full text-left text-body text-text-secondary"',
    );
  });

  it("shows the technology stack once and keeps weekly demos in the process copy", () => {
    expect(homepage).not.toContain("TechStrip");
    expect(homepage).not.toContain("BUILT_WITH");
    expect(homepage).not.toContain('title: "Weekly demos"');
    expect(homepage).toContain('fact.title !== "You own everything"');
    expect(homepage).toContain('"lg:grid-cols-3"');
    expect(homepage).toContain('"lg:grid-cols-4"');
    expect(homepage).toContain(">You own the code</h3>");
    expect(siteContent.match(/weekly demos/gi)).toHaveLength(1);
    expect(faqs).not.toMatch(/weekly demos/i);
  });

  it("keeps practical commitments in the process section, not an unproven proof section", () => {
    expect(homepage).toContain('eyebrow="How we work"');
    expect(homepage).not.toContain("Proof of how we work");
    expect(homepage).toContain("You own the code");
    expect(ENGAGEMENT_PROCESS[1]?.name).toBe("Scope & plan");
    expect(ENGAGEMENT_PROCESS.at(-1)?.name).toBe("Launch");
  });

  it("labels audience segments without claiming they are real clients", () => {
    expect(homepage).toContain('title="Teams we build for"');
    expect(homepage).not.toContain("real stakes");
  });
});
