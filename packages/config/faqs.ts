import type { ServiceFaq } from "./services";

/**
 * GLOBAL FAQS — company-level questions (service pages carry their own in
 * services.ts). Used by the /faq page, the homepage FAQ section and FAQPage
 * structured data.
 */
export const GLOBAL_FAQS: readonly ServiceFaq[] = [
  {
    question: "What does Ibtatech do?",
    answer:
      "Ibtatech is a digital technology and growth agency. We build websites, web applications and mobile apps for Android and iOS, and we run email automation and paid advertising programmes that turn attention into measurable revenue.",
  },
  {
    question: "Where do you work with clients?",
    answer:
      "We are set up for international remote delivery, with clients across the United Kingdom, Europe and beyond. Communication happens in your timezone, with shared project boards keeping work visible.",
  },
  {
    question: "How do projects start?",
    answer:
      "Every engagement starts with a free discovery call. We map your goals and constraints, then send a written scope with timeline and a preliminary estimate — before any commitment.",
  },
  {
    question: "How much does a project cost?",
    answer:
      "Focused websites typically start in the low five figures, and applications or platform builds scale with complexity. Because every system differs, we quote per project after scoping — you always approve the number before work begins.",
  },
  {
    question: "Who will actually work on my project?",
    answer:
      "Senior engineers and strategists — the people who scope your system build it. Nothing is handed to an anonymous junior team.",
  },
  {
    question: "Do you offer ongoing support after launch?",
    answer:
      "Yes. Launch is the start of the measurement cycle, not the end: we offer maintenance, monitoring and continuous improvement plans sized to your product.",
  },
  {
    question: "Who owns the code and accounts?",
    answer:
      "You do — full stop. Source code, infrastructure configuration, ad accounts and data belong to you. We work inside your assets with documented handover from day one.",
  },
  {
    question: "Do you guarantee results?",
    answer:
      "We guarantee process: rigorous tracking, transparent reporting and honest timelines. We never promise guaranteed rankings, returns or revenue — no credible engineering or growth partner can.",
  },
];
