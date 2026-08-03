import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || !['HR', 'ADMIN', 'MANAGER'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const components = await prisma.salaryComponent.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: components });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || !['HR', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, type, isDefault, defaultType, defaultValue } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing name or type' }, { status: 400 });
    }

    const component = await prisma.salaryComponent.create({
      data: {
        name,
        type,
        isDefault: isDefault ?? true,
        defaultType: defaultType || "FIXED",
        defaultValue: parseFloat(defaultValue) || 0,
      },
    });

    return NextResponse.json({ data: component });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Component name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
