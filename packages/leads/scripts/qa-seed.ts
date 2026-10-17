/**
 * QA seed utility (dev-only): ensures at least 3 sample leads exist in the
 * SQLite DB pointed at by DATABASE_URL. Run from packages/leads:
 *   DATABASE_URL="file:./dev.db" npx tsx scripts/qa-seed.ts
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const count = await p.lead.count();
  if (count < 3) {
    await p.lead.createMany({
      data: [
        {
          name: "QA Lead Alpha",
          email: "alpha@example.com",
          company: "Alpha Co",
          source: "contact",
          status: "new",
          budgetBand: "5k-15k",
          timeline: "asap",
          message: "Need a new marketing site urgently for our product launch.",
          consent: true,
          marketingConsent: false,
          detail: JSON.stringify({ service: "web-development" }),
        },
        {
          name: "QA Lead Beta",
          email: "beta@example.com",
          company: "Beta Ltd",
          source: "estimate",
          status: "contacted",
          budgetBand: "15k-50k",
          timeline: "3-6-months",
          message: "Estimating a mobile app with offline sync capabilities.",
          consent: true,
          marketingConsent: true,
          detail: JSON.stringify({ service: "mobile-app-development" }),
        },
        {
          name: "QA Lead Gamma",
          email: "gamma@example.com",
          source: "ads-audit",
          status: "new",
          message: "Please audit our Google Ads account spend and conversion tracking.",
          consent: true,
          marketingConsent: false,
          detail: JSON.stringify({
            service: "paid-advertising",
            auditKind: "ads",
            adPlatform: "google-ads",
            monthlyAdSpend: "2k-10k",
          }),
        },
      ],
    });
    console.log("seeded");
  } else {
    console.log("already has", count, "leads");
  }
  console.log("admins", await p.adminUser.count());
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
