import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/roleAuth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const shiftSettingsSchema = z.object({
  shiftStartTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:mm'),
  lateThresholdMins: z.number().min(0).max(120),
});

// GET /api/users/settings/shift - Get shift settings
export async function GET(request: Request) {
  const { user, error } = await requireRoles(request, ['MANAGER', 'ADMIN']);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const userSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        shiftStartTime: true,
        lateThresholdMins: true,
      },
    });

    return NextResponse.json({
      shiftStartTime: userSettings?.shiftStartTime || '09:00',
      lateThresholdMins: userSettings?.lateThresholdMins || 15,
    });
  } catch (error) {
    console.error('Failed to get shift settings:', error);
    return NextResponse.json(
      { error: 'Failed to get shift settings' },
      { status: 500 }
    );
  }
}

// PUT /api/users/settings/shift - Update shift settings
export async function PUT(request: Request) {
  const { user, error } = await requireRoles(request, ['MANAGER', 'ADMIN']);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = shiftSettingsSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        shiftStartTime: validatedData.shiftStartTime,
        lateThresholdMins: validatedData.lateThresholdMins,
      },
      select: {
        shiftStartTime: true,
        lateThresholdMins: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to update shift settings:', error);
    return NextResponse.json(
      { error: 'Failed to update shift settings' },
      { status: 500 }
    );
  }
}
