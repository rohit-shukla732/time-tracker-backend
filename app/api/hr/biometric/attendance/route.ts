import { NextRequest, NextResponse } from 'next/server';
import { requireHR } from '@/lib/roleAuth';
import { queryBiometric } from '@/lib/mssql';

/**
 * GET /api/hr/biometric/attendance
 * Fetch attendance records from biometric system
 * Query params: date (YYYY-MM-DD), employeeId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user - only HR/ADMIN can access
    const authResult = await requireHR(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const employeeId = searchParams.get('employeeId');

    // Query Mx_ACSEventTrn table
    // IOType: 0 = IN, 1 = OUT
    // IDateTime: Check in/out timestamp
    // UserID: Employee ID (e.g., ACE123)
    
    let query = `
      SELECT 
        UserID,
        IDateTime,
        IOType,
        CASE 
          WHEN IOType = 0 THEN 'IN'
          WHEN IOType = 1 THEN 'OUT'
          ELSE 'UNKNOWN'
        END as Status
      FROM 
        Mx_ACSEventTrn
      WHERE 
        CAST(IDateTime AS DATE) = @date
    `;

    const params: Record<string, any> = { date };

    if (employeeId) {
      query += ` AND UserID = @employeeId`;
      params.employeeId = employeeId.trim();
    }

    query += ` ORDER BY IDateTime ASC`;

    const result = await queryBiometric(query, params);

    return NextResponse.json({
      success: true,
      date,
      count: result.recordset.length,
      records: result.recordset,
    });
  } catch (error: any) {
    console.error('Error fetching biometric attendance:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch attendance records',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
