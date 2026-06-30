import { PrismaClient, RoleProfile } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const AREAS = [
  { code: "EXT", name: "Extrusion" },
  { code: "IM", name: "Injection Moulding" },
  { code: "HP", name: "Hydraulic Press" },
  { code: "MX", name: "High Speed Mixer/Cooler" },
  { code: "RG", name: "Regrind & Recovery" },
];

const DOMAINS = [
  { code: "D1", name: "Process & Product Parameters" },
  { code: "D2", name: "Machine Handling & Autonomous Maintenance" },
  { code: "D3", name: "Process & Machine Troubleshooting" },
  { code: "D4", name: "Handling Quality Concerns" },
  { code: "D5", name: "OEE Targets & NCR Raising" },
  { code: "D6", name: "CAPA & Root Cause Analysis" },
  { code: "D7", name: "Safety Skills", isSafetyCritical: true },
  { code: "D8", name: "SMED & 5S" },
];

// Target competency level (0-4) per role profile per domain.
// Adjust these to match your actual Competency Framework (SCF-001).
const TARGETS: Record<RoleProfile, number> = {
  PO_ENTRY: 1,
  PO: 2,
  SPO: 3,
  LO_TL: 3,
  TRN: 4,
};

async function main() {
  console.log("Seeding production areas...");
  const areas = await Promise.all(
    AREAS.map((a) =>
      prisma.productionArea.upsert({
        where: { code: a.code },
        update: {},
        create: a,
      })
    )
  );

  console.log("Seeding domains...");
  const domains = await Promise.all(
    DOMAINS.map((d) =>
      prisma.domain.upsert({
        where: { code: d.code },
        update: {},
        create: d,
      })
    )
  );

  console.log("Seeding role profile targets...");
  for (const domain of domains) {
    for (const roleProfile of Object.keys(TARGETS) as RoleProfile[]) {
      await prisma.roleProfileTarget.upsert({
        where: { roleProfile_domainId: { roleProfile, domainId: domain.id } },
        update: { targetLevel: TARGETS[roleProfile] },
        create: { roleProfile, domainId: domain.id, targetLevel: TARGETS[roleProfile] },
      });
    }
  }

  console.log("Seeding training programmes (40 standard programmes)...");
  for (const area of areas) {
    for (const domain of domains) {
      const code = `${area.code}_${domain.code}`;
      await prisma.trainingProgramme.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: `${area.name} — ${domain.name}`,
          productionAreaId: area.id,
          domainId: domain.id,
          deliveryMethod: "CLASSROOM",
          levelFrom: 0,
          levelTo: 2,
          refreshFrequency: domain.isSafetyCritical ? "ANNUAL" : "NONE",
        },
      });
    }
  }

  console.log("Creating initial admin user...");
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "System Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`\nDone.\nAdmin login: ${adminEmail} / ${adminPassword}\n(Change this password immediately after first login.)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
