/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, saltBytes: 16 };

function hashPassword(password) {
  const salt = randomBytes(SCRYPT.saltBytes);
  const derived = scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

const prisma = new PrismaClient();
const PASSWORD = "Phase5-QA-Bootstrap-2026!";

async function upsert(email, name, role) {
  const passwordHash = hashPassword(PASSWORD);
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: { active: true, role, passwordHash },
    });
    console.log("updated", email, role);
    return;
  }
  await prisma.adminUser.create({
    data: { email, name, role, passwordHash, active: true },
  });
  console.log("created", email, role);
}

(async () => {
  await upsert("qa-admin@ibtatech.test", "QA Admin", "admin");
  await upsert("qa-staff@ibtatech.test", "QA Staff", "staff");
  await upsert("qa-client@ibtatech.test", "QA Client", "client");
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
