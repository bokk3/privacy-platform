// Seeds local/dev databases with a default request template and a handful
// of EXAMPLE broker entries so the workflow can be exercised end-to-end
// without needing real broker data yet.
//
// IMPORTANT: the brokers below are illustrative placeholders for
// development only (fictional contact addresses on an example.com domain).
// Real broker records — verified names, opt-out URLs, and contact
// addresses — must be entered through the Admin > Brokers UI (built in a
// later step) or a vetted, sourced data import, never invented data.

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/hash.js";

const prisma = new PrismaClient();

const DEFAULT_TEMPLATE = {
  name: "Generic CCPA/GDPR Deletion Request",
  channel: "EMAIL",
  isDefaultGeneric: true,
  subjectTemplate: "Data Deletion Request — {{fullName}}",
  bodyTemplate: `Dear {{brokerName}} Privacy Team,

Under applicable data protection law (including, where relevant, the GDPR and CCPA/CPRA), I am requesting that you:

1. Confirm whether you hold personal data about me.
2. Delete/erase all personal data you hold about me.
3. Confirm in writing once this has been completed.

My details for identification purposes:
Full name: {{fullName}}
{{#if previousNames}}Previous/other names: {{previousNames}}{{/if}}
Email address(es) on file: {{emails}}
{{#if addresses}}Address(es) on file: {{addresses}}{{/if}}

Please respond within the timeframe required by applicable law. If you require additional information to locate my records, please contact me at {{replyToEmail}}.

Regards,
{{fullName}}`,
};

const EXAMPLE_BROKERS = [
  {
    name: "Example Data Aggregators Inc. (DEV SEED)",
    website: "https://example-data-aggregators.example.com",
    contactEmail: "privacy@example-data-aggregators.example.com",
    privacyUrl: "https://example-data-aggregators.example.com/privacy",
    optOutUrl: "https://example-data-aggregators.example.com/opt-out",
    method: "EMAIL",
    apiSupport: false,
    expectedResponseDays: 30,
    status: "ACTIVE",
    notes: "Development seed data — not a real company. Replace before production use.",
  },
  {
    name: "Sample People Search Co. (DEV SEED)",
    website: "https://sample-people-search.example.com",
    contactEmail: null,
    privacyUrl: "https://sample-people-search.example.com/privacy",
    optOutUrl: "https://sample-people-search.example.com/remove-my-info",
    method: "WEB_FORM",
    apiSupport: false,
    expectedResponseDays: 14,
    status: "ACTIVE",
    notes: "Development seed data — not a real company. Uses a web form opt-out flow.",
  },
  {
    name: "Placeholder Marketing Data LLC (DEV SEED)",
    website: "https://placeholder-marketing-data.example.com",
    contactEmail: "dsr@placeholder-marketing-data.example.com",
    privacyUrl: "https://placeholder-marketing-data.example.com/privacy",
    optOutUrl: null,
    method: "API",
    apiSupport: true,
    apiConfig: {
      endpoint: "https://api.placeholder-marketing-data.example.com/v1/dsr",
      authType: "bearer",
      fieldMapping: { fullName: "subject.name", email: "subject.email" },
    },
    expectedResponseDays: 45,
    status: "UNDER_REVIEW",
    notes: "Development seed data — not a real company. Simulates an API-based DSR integration.",
  },
];

async function main() {
  console.log("Seeding database (development fixtures)...");

  // SEED ROOT ADMIN
  const adminEmail = "admin@incognito.local";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await hashPassword("Admin123!");
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        emailVerifiedAt: new Date(),
      }
    });
    console.log(`  Admin ready: ${adminEmail} / Admin123!`);
  } else {
    console.log(`  Admin already exists: ${adminEmail}`);
  }

  const template = await prisma.requestTemplate.upsert({
    where: { id: "seed-default-template" },
    update: {},
    create: { id: "seed-default-template", ...DEFAULT_TEMPLATE },
  });
  console.log(`  Default template ready: ${template.name}`);

  for (const broker of EXAMPLE_BROKERS) {
    const created = await prisma.broker.upsert({
      where: { name: broker.name },
      update: broker,
      create: broker,
    });
    console.log(`  Broker ready: ${created.name} (${created.method})`);
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
