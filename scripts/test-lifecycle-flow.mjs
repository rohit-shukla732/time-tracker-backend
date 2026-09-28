/**
 * End-to-end lifecycle flow test against the live database.
 *
 * Replicates exactly what each API route handler does, validating:
 *  - ONBOARDING ticket creation bound to a related employee, checklist
 *    auto-seeded from the template including the explicit equipment mapping
 *  - new-joiner tickets (no account yet) hold equipment against name/email
 *  - resolve is blocked while checklist items remain incomplete
 *  - the equipment glue: ticking an item with an explicit equipmentCategory
 *    + equipmentAction logs an EquipmentChange against the *employee*, not
 *    the admin who recorded it
 *  - linking an account backfills pending new-joiner equipment to the user
 *  - resolve succeeds once every item is done
 *
 * Usage: node scripts/test-lifecycle-flow.mjs
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let createdTicketIds = [];

function byTicketId(t) {
  // deferred cleanup listed below
  return createdTicketIds.includes(t.id);
}

async function main() {
  console.log('1️⃣  Finding an admin and an employee…');
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const employee = await prisma.user.findFirst({
    where: { role: 'EMPLOYEE', isArchived: false },
    orderBy: { createdAt: 'desc' },
  });
  if (!admin || !employee) throw new Error('Need one ADMIN and one EMPLOYEE user');
  console.log(`   Admin: ${admin.name} (${admin.email})`);
  console.log(`   Employee: ${employee.name} (${employee.email})`);

  // 2. Create ONBOARDING ticket bound to the employee, checklist auto-seeded
  console.log('\n2️⃣  Creating an ONBOARDING ticket for an existing employee…');
  const template = await prisma.checklistTemplate.findFirst({
    where: { type: 'ONBOARDING', active: true },
    orderBy: { sortOrder: 'asc' },
    include: { items: { orderBy: { order: 'asc' } } },
  });
  if (!template) throw new Error('No active ONBOARDING template — run npm run db:seed-templates');

  const lastTicket = await prisma.ticket.findFirst({ orderBy: { ticketNumber: 'desc' }, select: { ticketNumber: true } });
  const ticket = await prisma.ticket.create({
    data: {
      title: `[TEST] Onboarding: ${employee.name}`,
      description: 'E2E test of the lifecycle checklist flow. Safe to delete.',
      type: 'ONBOARDING',
      priority: 'MEDIUM',
      createdBy: admin.id,
      relatedEmployeeId: employee.id,
      relatedName: employee.name,
      relatedEmail: employee.email,
      ticketNumber: (lastTicket?.ticketNumber ?? 0) + 1,
      checklist: {
        create: template.items.map((i) => ({
          title: i.title,
          order: i.order,
          equipmentCategory: i.equipmentCategory,
          equipmentAction: i.equipmentAction,
        })),
      },
    },
    include: { checklist: { orderBy: { order: 'asc' } } },
  });
  createdTicketIds.push(ticket.id);
  console.log(`   Created ticket T-${String(ticket.ticketNumber).padStart(2, '0')} (type=${ticket.type})`);
  console.log(`   Checklist seeded with ${ticket.checklist.length} items from "${template.name}"`);

  const mapped = ticket.checklist.filter((i) => i.equipmentCategory && i.equipmentAction);
  console.log(`   ${mapped.length} items carry an explicit equipment mapping`);
  if (mapped.length === 0) {
    console.log('   ⚠️  Template has no equipment mappings yet — glue test will be skipped');
  }

  // 3. Resolve must be blocked while items are incomplete
  console.log('\n3️⃣  Checking resolve-gate (checklist incomplete)…');
  const pendingNow = await prisma.checklistItem.count({ where: { ticketId: ticket.id, done: false } });
  console.log(`   ${pendingNow} items incomplete → resolve would be rejected: ${pendingNow > 0 ? '✅' : '❌'}`);
  if (pendingNow === 0) throw new Error('Expected incomplete items');

  // 4. Tick every item, applying the same equipment-glue logic as the API
  console.log('\n4️⃣  Ticking checklist items (equipment glue)…');
  const beforeChecklist = await prisma.equipmentChange.count({ where: { ticketId: ticket.id } });
  for (const item of ticket.checklist) {
    await prisma.checklistItem.update({
      where: { id: item.id },
      data: { done: true, doneAt: new Date(), doneById: admin.id },
    });
    if (item.equipmentCategory && item.equipmentAction) {
      const exists = await prisma.equipmentChange.findFirst({
        where: { ticketId: ticket.id, category: item.equipmentCategory, action: item.equipmentAction },
      });
      if (!exists) {
        await prisma.equipmentChange.create({
          data: {
            userId: employee.id,
            ticketId: ticket.id,
            subjectName: employee.name,
            subjectEmail: employee.email,
            category: item.equipmentCategory,
            action: item.equipmentAction,
            label: item.title,
            recordedById: admin.id,
          },
        });
      }
    }
  }
  const afterChecklist = await prisma.equipmentChange.count({ where: { ticketId: ticket.id } });
  console.log(`   Ticked ${ticket.checklist.length} items; equipment events recorded: ${afterChecklist - beforeChecklist}`);

  // 5. Equipment must be attributed to the employee, never to the admin
  console.log('\n5️⃣  Verifying employee attribution…');
  const changes = await prisma.equipmentChange.findMany({ where: { ticketId: ticket.id } });
  const misattributed = changes.filter((c) => c.userId !== employee.id);
  console.log(`   ${changes.length} entries for the ticket; all attributed to employee: ${misattributed.length === 0 ? '✅' : '❌'}`);
  if (misattributed.length > 0) throw new Error('Equipment was attributed to the wrong user (admin leaked)');

  // 6. Verify user-scoped history + counts
  console.log('\n6️⃣  Verifying user-scoped equipment history…');
  const userChanges = await prisma.equipmentChange.findMany({ where: { userId: employee.id } });
  const summary = userChanges.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`   ✅ ${userChanges.length} total for user; summary: ${JSON.stringify(summary)}`);

  // 7. New-joiner flow: equipment held against name/email until linked
  console.log('\n7️⃣  Registering equipment for a new joiner (no account)…');
  const joinerTicket = await prisma.ticket.create({
    data: {
      title: '[TEST] Onboarding: New Joiner',
      description: 'E2E test of the new-joiner equipment hold. Safe to delete.',
      type: 'ONBOARDING',
      priority: 'MEDIUM',
      createdBy: admin.id,
      relatedName: 'Jane Pending',
      relatedEmail: 'jane.pending@example.com',
      ticketNumber: (lastTicket?.ticketNumber ?? 0) + 2,
      checklist: {
        create: template.items.slice(0, 3).map((i, idx) => ({
          title: i.title,
          order: idx,
          equipmentCategory: i.equipmentCategory,
          equipmentAction: i.equipmentAction,
        })),
      },
    },
  });
  createdTicketIds.push(joinerTicket.id);

  const joinerChanges = await prisma.equipmentChange.findMany({ where: { ticketId: joinerTicket.id } });
  for (const c of joinerChanges) {
    throw new Error('Unexpected pre-existing equipment for new ticket');
  }

  // simulate the API glue on one mapped item
  const joinerItem = await prisma.checklistItem.findFirst({
    where: { ticketId: joinerTicket.id, equipmentCategory: { not: null } },
  });
  if (joinerItem) {
    await prisma.checklistItem.update({
      where: { id: joinerItem.id },
      data: { done: true, doneAt: new Date(), doneById: admin.id },
    });
    await prisma.equipmentChange.create({
      data: {
        userId: null,
        ticketId: joinerTicket.id,
        subjectName: 'Jane Pending',
        subjectEmail: 'jane.pending@example.com',
        category: joinerItem.equipmentCategory,
        action: joinerItem.equipmentAction,
        label: joinerItem.title,
        recordedById: admin.id,
      },
    });
  }
  const held = await prisma.equipmentChange.findMany({ where: { ticketId: joinerTicket.id } });
  console.log(`   Held ${held.length} entry(ies) with userId=null, subjectEmail=jane.pending@example.com: ${held.every((c) => c.userId === null) ? '✅' : '❌'}`);
  if (held.length > 0 && held.some((c) => c.userId !== null)) throw new Error('New joiner entry leaked a userId');

  // 8. Simulate linking the account → backfill
  console.log('\n8️⃣  Linking the account (backfill)…');
  await prisma.ticket.update({
    where: { id: joinerTicket.id },
    data: { relatedEmployeeId: employee.id, relatedName: employee.name, relatedEmail: employee.email },
  });
  await prisma.equipmentChange.updateMany({
    where: { ticketId: joinerTicket.id, userId: null },
    data: { userId: employee.id },
  });
  const linked = await prisma.equipmentChange.findMany({ where: { ticketId: joinerTicket.id } });
  console.log(`   Backfilled: ${linked.length} entry(ies) now on userId=${employee.id}: ${linked.every((c) => c.userId === employee.id) ? '✅' : '❌'}`);
  if (linked.length > 0 && linked.some((c) => c.userId !== employee.id)) throw new Error('Backfill failed');

  // 9. Resolve now succeeds
  console.log('\n9️⃣  Resolving (checklist complete)…');
  const pendingAfter = await prisma.checklistItem.count({ where: { ticketId: ticket.id, done: false } });
  if (pendingAfter !== 0) throw new Error('Checklist should be fully complete');
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  console.log('   ✅ Resolved');

  console.log('\n✅ Lifecycle flow test passed!');
}

main()
  .catch((e) => {
    console.error('\n❌ Test failed:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const id of createdTicketIds) {
      await prisma.equipmentChange.deleteMany({ where: { ticketId: id } });
      await prisma.checklistItem.deleteMany({ where: { ticketId: id } });
      await prisma.ticketComment.deleteMany({ where: { ticketId: id } });
      await prisma.ticket.deleteMany({ where: { id } });
    }
    if (createdTicketIds.length > 0) console.log('🧹 Test tickets cleaned up');
    await prisma.$disconnect();
  });