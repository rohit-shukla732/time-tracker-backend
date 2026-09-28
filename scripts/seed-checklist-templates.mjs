/**
 * Seed default ONBOARDING / OFFBOARDING checklist templates.
 *
 * Idempotent: templates are keyed by (type, name), so re-running this script
 * will only insert templates that don't already exist. Existing templates and
 * any edits made to them through the admin UI are preserved.
 *
 * Since v0.3, when a template already exists its items are matched by title
 * and the explicit equipment mapping (equipmentCategory / equipmentAction) is
 * back-filled where the seed defines one — so existing databases pick up the
 * new mappings without touching any other admin edits.
 *
 * Usage: node scripts/seed-checklist-templates.mjs
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** ONBOARDING: standard new-joiner IT setup */
const ONBOARDING_ITEMS = [
  { title: 'Create user account (email + SSO)', optional: false },
  { title: 'Add to HR & payroll system', optional: false },
  { title: 'Issue laptop (record serial in equipment log)', optional: false, equipmentCategory: 'LAPTOP', equipmentAction: 'ISSUED' },
  { title: 'Issue monitor', optional: true, equipmentCategory: 'MONITOR', equipmentAction: 'ISSUED' },
  { title: 'Issue keyboard & mouse', optional: true, equipmentCategory: 'KEYBOARD', equipmentAction: 'ISSUED' },
  { title: 'Issue headset', optional: true, equipmentCategory: 'HEADSET', equipmentAction: 'ISSUED' },
  { title: 'Assign seat / workstation (record in equipment log)', optional: false, equipmentCategory: 'SEAT', equipmentAction: 'RELOCATED' },
  { title: 'Configure VPN & network access', optional: false },
  { title: 'Install required software & licenses', optional: false },
  { title: 'Set up biometric attendance registration', optional: true },
  { title: 'Walkthrough: helpdesk portal & ticket creation', optional: true },
  { title: 'Obtain signed equipment acknowledgement', optional: true },
];

/** OFFBOARDING: standard exit process */
const OFFBOARDING_ITEMS = [
  { title: 'Collect laptop (record return in equipment log)', optional: false, equipmentCategory: 'LAPTOP', equipmentAction: 'RETURNED' },
  { title: 'Collect monitor', optional: false, equipmentCategory: 'MONITOR', equipmentAction: 'RETURNED' },
  { title: 'Collect keyboard & mouse', optional: false, equipmentCategory: 'KEYBOARD', equipmentAction: 'RETURNED' },
  { title: 'Collect headset', optional: true, equipmentCategory: 'HEADSET', equipmentAction: 'RETURNED' },
  { title: 'Revoke email & SSO access', optional: false },
  { title: 'Revoke VPN & network access', optional: false },
  { title: 'Recover software licenses', optional: false },
  { title: 'Release seat / workstation (record in equipment log)', optional: false, equipmentCategory: 'SEAT', equipmentAction: 'RELOCATED' },
  { title: 'Remove biometric attendance registration', optional: true },
  { title: 'Offboard from HR & payroll system', optional: false },
  { title: 'Archive user account', optional: false },
  { title: 'Final settlement & clearance confirmation', optional: true },
];

const TEMPLATES = [
  { type: 'ONBOARDING', name: 'Standard Onboarding', items: ONBOARDING_ITEMS },
  { type: 'OFFBOARDING', name: 'Standard Offboarding', items: OFFBOARDING_ITEMS },
];

async function main() {
  console.log('Seeding checklist templates...');

  for (const [index, t] of TEMPLATES.entries()) {
    const existing = await prisma.checklistTemplate.findFirst({
      where: { type: t.type, name: t.name },
      select: { id: true },
    });

    if (existing) {
      const existingItems = await prisma.checklistTemplateItem.findMany({
        where: { templateId: existing.id },
      });
      const seedByTitle = new Map(t.items.map((item) => [item.title, item]));
      let updated = 0;
      for (const eItem of existingItems) {
        const seed = seedByTitle.get(eItem.title);
        if (
          seed &&
          (seed.equipmentCategory || seed.equipmentAction) &&
          (eItem.equipmentCategory !== (seed.equipmentCategory ?? null) ||
            eItem.equipmentAction !== (seed.equipmentAction ?? null))
        ) {
          await prisma.checklistTemplateItem.update({
            where: { id: eItem.id },
            data: {
              equipmentCategory: seed.equipmentCategory ?? null,
              equipmentAction: seed.equipmentAction ?? null,
            },
          });
          updated += 1;
        }
      }
      console.log(
        updated > 0
          ? `🔧 ${t.type} template "${t.name}" — updated equipment mapping on ${updated} existing item(s)`
          : `⏭️  ${t.type} template "${t.name}" already exists — skipping`,
      );
      continue;
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        type: t.type,
        name: t.name,
        active: true,
        sortOrder: index,
        items: {
          create: t.items.map((item, i) => ({
            title: item.title,
            order: i,
            optional: item.optional,
            equipmentCategory: item.equipmentCategory || null,
            equipmentAction: item.equipmentAction || null,
          })),
        },
      },
      include: { items: true },
    });

    console.log(`✅ Created ${t.type} template "${t.name}" with ${template.items.length} items`);
  }

  console.log('✅ Checklist template seeding complete');
}

main()
  .catch((e) => {
    console.error('Error seeding checklist templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
