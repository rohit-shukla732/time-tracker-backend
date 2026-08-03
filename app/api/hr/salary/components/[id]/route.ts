import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || !['HR', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const id = params.id;
    const { name, type, defaultType, defaultValue } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing name or type' }, { status: 400 });
    }

    const updated = await prisma.salaryComponent.update({
      where: { id },
      data: {
        name,
        type,
        defaultType,
        defaultValue: parseFloat(defaultValue) || 0,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Component name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
