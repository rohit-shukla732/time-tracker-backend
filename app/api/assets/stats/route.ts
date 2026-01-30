import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

// GET - Get asset statistics and dashboard data
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const [
      totalAssets,
      availableAssets,
      assignedAssets,
      inMaintenanceAssets,
      damagedAssets,
      userSideAssets,
      itInfrastructureAssets,
      activeAssignments,
      pendingMaintenance,
      assetsByCategory,
      recentAssignments,
      upcomingMaintenance,
    ] = await Promise.all([
      // Total assets
      prisma.asset.count(),

      // Available assets
      prisma.asset.count({
        where: { status: 'AVAILABLE' },
      }),

      // Assigned assets
      prisma.asset.count({
        where: { status: 'ASSIGNED' },
      }),

      // In maintenance assets
      prisma.asset.count({
        where: { status: 'IN_MAINTENANCE' },
      }),

      // Damaged assets
      prisma.asset.count({
        where: { status: 'DAMAGED' },
      }),

      // User side assets
      prisma.asset.count({
        where: { assetType: 'USER_SIDE' },
      }),

      // IT infrastructure assets
      prisma.asset.count({
        where: { assetType: 'IT_INFRASTRUCTURE' },
      }),

      // Active assignments
      prisma.assetAssignment.count({
        where: { status: 'ACTIVE' },
      }),

      // Pending maintenance
      prisma.assetMaintenance.count({
        where: {
          status: {
            in: ['SCHEDULED', 'IN_PROGRESS'],
          },
        },
      }),

      // Assets by category
      prisma.asset.groupBy({
        by: ['category'],
        _count: {
          category: true,
        },
      }),

      // Recent assignments
      prisma.assetAssignment.findMany({
        take: 5,
        orderBy: {
          assignedDate: 'desc',
        },
        include: {
          asset: {
            select: {
              name: true,
              category: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),

      // Upcoming maintenance
      prisma.assetMaintenance.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledDate: {
            gte: new Date(),
          },
        },
        take: 5,
        orderBy: {
          scheduledDate: 'asc',
        },
        include: {
          asset: {
            select: {
              name: true,
              category: true,
            },
          },
        },
      }),
    ]);

    const stats = {
      overview: {
        totalAssets,
        availableAssets,
        assignedAssets,
        inMaintenanceAssets,
        damagedAssets,
        userSideAssets,
        itInfrastructureAssets,
        activeAssignments,
        pendingMaintenance,
      },
      assetsByCategory: assetsByCategory.map((item) => ({
        category: item.category,
        count: item._count.category,
      })),
      recentAssignments,
      upcomingMaintenance,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching asset stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset statistics' },
      { status: 500 }
    );
  }
}
