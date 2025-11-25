import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/hash';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with role-based demo data...');

  // Create demo users with different roles
  const hashedPassword = await hashPassword('demo123');

  // Create Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aceems.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@aceems.com',
      passwordHash: hashedPassword,
      role: 'ADMIN'
    }
  });

  // Create HR user
  const hr = await prisma.user.upsert({
    where: { email: 'hr@aceems.com' },
    update: {},
    create: {
      name: 'HR Manager',
      email: 'hr@aceems.com',
      passwordHash: hashedPassword,
      role: 'HR'
    }
  });

  // Create Development Team
  const devTeam = await prisma.team.upsert({
    where: { name: 'Development Team' },
    update: {},
    create: {
      name: 'Development Team',
      description: 'Software development and engineering team'
    }
  });

  // Create Marketing Team
  const marketingTeam = await prisma.team.upsert({
    where: { name: 'Marketing Team' },
    update: {},
    create: {
      name: 'Marketing Team',
      description: 'Marketing and communications team'
    }
  });

  // Create Manager for Development Team
  const devManager = await prisma.user.upsert({
    where: { email: 'dev.manager@aceems.com' },
    update: {},
    create: {
      name: 'Dev Manager',
      email: 'dev.manager@aceems.com',
      passwordHash: hashedPassword,
      role: 'MANAGER',
      teamId: devTeam.id
    }
  });

  // Update Development Team with manager
  await prisma.team.update({
    where: { id: devTeam.id },
    data: { managerId: devManager.id }
  });

  // Create Manager for Marketing Team
  const marketingManager = await prisma.user.upsert({
    where: { email: 'marketing.manager@aceems.com' },
    update: {},
    create: {
      name: 'Marketing Manager',
      email: 'marketing.manager@aceems.com',
      passwordHash: hashedPassword,
      role: 'MANAGER',
      teamId: marketingTeam.id
    }
  });

  // Update Marketing Team with manager
  await prisma.team.update({
    where: { id: marketingTeam.id },
    data: { managerId: marketingManager.id }
  });

  // Create Development Team Employees
  const devEmployee1 = await prisma.user.upsert({
    where: { email: 'john.dev@aceems.com' },
    update: {},
    create: {
      name: 'John Developer',
      email: 'john.dev@aceems.com',
      passwordHash: hashedPassword,
      role: 'EMPLOYEE',
      teamId: devTeam.id
    }
  });

  const devEmployee2 = await prisma.user.upsert({
    where: { email: 'jane.dev@aceems.com' },
    update: {},
    create: {
      name: 'Jane Developer',
      email: 'jane.dev@aceems.com',
      passwordHash: hashedPassword,
      role: 'EMPLOYEE',
      teamId: devTeam.id
    }
  });

  // Create Marketing Team Employees
  const marketingEmployee1 = await prisma.user.upsert({
    where: { email: 'alice.marketing@aceems.com' },
    update: {},
    create: {
      name: 'Alice Marketing',
      email: 'alice.marketing@aceems.com',
      passwordHash: hashedPassword,
      role: 'EMPLOYEE',
      teamId: marketingTeam.id
    }
  });

  const marketingEmployee2 = await prisma.user.upsert({
    where: { email: 'bob.marketing@aceems.com' },
    update: {},
    create: {
      name: 'Bob Marketing',
      email: 'bob.marketing@aceems.com',
      passwordHash: hashedPassword,
      role: 'EMPLOYEE',
      teamId: marketingTeam.id
    }
  });

  // Create some demo session data
  const sessionId = 'demo-session-' + Date.now();
  const startTime = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago
  const endTime = new Date();

  await prisma.session.create({
    data: {
      sessionId,
      userId: devEmployee1.id,
      startedAt: startTime,
      endedAt: endTime,
      rawStartEvent: JSON.stringify({ type: 'session_start', app: 'vs-code' }),
      rawEndEvent: JSON.stringify({ type: 'session_end', app: 'vs-code' })
    }
  });

  // Create session summary
  const workTimeMs = 7 * 60 * 60 * 1000; // 7 hours of actual work
  const breakTimeMs = 30 * 60 * 1000; // 30 minutes break
  const idleTimeMs = 30 * 60 * 1000; // 30 minutes idle

  await prisma.sessionSummary.create({
    data: {
      sessionId,
      userId: devEmployee1.id,
      sessionDurationMs: BigInt(8 * 60 * 60 * 1000), // 8 hours total
      totalBreakMs: BigInt(breakTimeMs),
      totalIdleMs: BigInt(idleTimeMs),
      workTimeMs: BigInt(workTimeMs)
    }
  });

  console.log('Demo data created successfully!');
  console.log('\nDemo Users:');
  console.log('Admin: admin@aceems.com / demo123');
  console.log('HR: hr@aceems.com / demo123');
  console.log('Dev Manager: dev.manager@aceems.com / demo123');
  console.log('Marketing Manager: marketing.manager@aceems.com / demo123');
  console.log('Dev Employee 1: john.dev@aceems.com / demo123');
  console.log('Dev Employee 2: jane.dev@aceems.com / demo123');
  console.log('Marketing Employee 1: alice.marketing@aceems.com / demo123');
  console.log('Marketing Employee 2: bob.marketing@aceems.com / demo123');
  console.log('\nTeams:');
  console.log(`Development Team (${devTeam.id}) - Manager: Dev Manager`);
  console.log(`Marketing Team (${marketingTeam.id}) - Manager: Marketing Manager`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });