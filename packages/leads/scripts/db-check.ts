/**
 * DB inspection utility (dev-only): prints recent leads from the SQLite DB
 * pointed at by DATABASE_URL. Run from packages/leads:
 *   DATABASE_URL="file:./dev.db" npx tsx scripts/db-check.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      createdAt: true,
      name: true,
      email: true,
      company: true,
      website: true,
      source: true,
      status: true,
      detail: true,
      openLeadKey: true,
    },
  });
  console.log(JSON.stringify(leads, null, 2));
  console.log("TOTAL:", await prisma.lead.count());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
