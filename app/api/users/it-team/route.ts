import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

// GET /api/users/it-team - Get all IT team members (ADMIN and HR roles)
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all users with ADMIN or HR role
    const itTeam = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'HR' },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(itTeam);
  } catch (error: any) {
    console.error('Error fetching IT team:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch IT team' },
      { status: 500 }
    );
  }
}
