import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/roleAuth';
import { prisma } from '@/lib/prisma';

// DELETE /api/attendance/check-late/reset
// Clears today's LATE_ARRIVAL notifications so the check fires fresh
// ADMIN/HR clears all managers; MANAGER clears only their own
export async function DELETE(request: Request) {
  const { user, error } = await requireRoles(request, ['ADMIN', 'HR', 'MANAGER']);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const where: any = {
    type: 'LATE_ARRIVAL',
    createdAt: { gte: todayStart },
  };

  // Managers can only reset their own notification
  if (user.role === 'MANAGER') {
    where.userId = user.id;
  }

  const { count } = await prisma.notification.deleteMany({ where });

  return NextResponse.json({ message: `Cleared ${count} late arrival notification(s) for today` });
}
