import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/roleAuth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, ['MANAGER', 'ADMIN', 'HR']);
    
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { reportData, filters, format } = body;

    if (!reportData || !format) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (format === 'excel') {
      // For now, return JSON that can be converted to Excel on frontend
      // In production, use a library like 'exceljs' to generate actual Excel files
      return NextResponse.json({
        success: true,
        data: reportData,
        format: 'excel',
        contentType: 'application/json',
      });
    } else if (format === 'pdf') {
      // For now, return JSON that can be converted to PDF on frontend
      // In production, use a library like 'pdfkit' or 'puppeteer' to generate actual PDFs
      return NextResponse.json({
        success: true,
        data: reportData,
        format: 'pdf',
        contentType: 'application/json',
      });
    }

    return NextResponse.json(
      { error: 'Invalid format' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    );
  }
}
