import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/tickets/[id]/screenshots - Upload screenshots
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const ticketId = params.id;

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if user owns the ticket or is admin
    if (ticket.createdBy !== user.id && user.role !== 'ADMIN' && user.role !== 'HR') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const formData = await req.formData();
    const files = formData.getAll('screenshots') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 screenshots allowed' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'tickets');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const savedScreenshots = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}` },
          { status: 400 }
        );
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File too large: ${file.name}` },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const ext = file.name.split('.').pop();
      const filename = `${ticketId}-${timestamp}-${randomStr}.${ext}`;
      const filepath = join(uploadsDir, filename);

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Save to database
      const screenshot = await prisma.ticketScreenshot.create({
        data: {
          ticketId,
          filename: file.name,
          url: `/uploads/tickets/${filename}`,
          size: file.size,
          mimeType: file.type,
        },
      });

      savedScreenshots.push(screenshot);
    }

    return NextResponse.json(savedScreenshots, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading screenshots:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload screenshots' },
      { status: 500 }
    );
  }
}

// GET /api/tickets/[id]/screenshots - Get ticket screenshots
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const ticketId = params.id;

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if user owns the ticket or is admin
    if (ticket.createdBy !== user.id && user.role !== 'ADMIN' && user.role !== 'HR') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const screenshots = await prisma.ticketScreenshot.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(screenshots);
  } catch (error: any) {
    console.error('Error fetching screenshots:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch screenshots' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id]/screenshots/[screenshotId] - Delete a screenshot
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const { searchParams } = new URL(req.url);
    const screenshotId = searchParams.get('screenshotId');

    if (!screenshotId) {
      return NextResponse.json({ error: 'Screenshot ID required' }, { status: 400 });
    }

    // Get screenshot
    const screenshot = await prisma.ticketScreenshot.findUnique({
      where: { id: screenshotId },
      include: { ticket: true },
    });

    if (!screenshot) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    // Check permissions
    if (screenshot.ticket.createdBy !== user.id && user.role !== 'ADMIN' && user.role !== 'HR') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete from database
    await prisma.ticketScreenshot.delete({
      where: { id: screenshotId },
    });

    // TODO: Delete physical file (optional - can keep for audit trail)
    // const fs = require('fs');
    // const filepath = join(process.cwd(), 'public', screenshot.url);
    // if (fs.existsSync(filepath)) {
    //   fs.unlinkSync(filepath);
    // }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting screenshot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete screenshot' },
      { status: 500 }
    );
  }
}
