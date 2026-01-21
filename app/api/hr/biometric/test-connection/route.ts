import { NextRequest, NextResponse } from 'next/server';
import { requireHR } from '@/lib/roleAuth';
import { queryBiometric, BiometricAttendance } from '@/lib/mssql';

/**
 * GET /api/hr/biometric/test-connection
 * Test connection to biometric database
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

    // Test query - adjust based on your actual biometric DB schema
    const result = await queryBiometric(`
      SELECT TOP 1 
        TABLE_NAME 
      FROM 
        INFORMATION_SCHEMA.TABLES
      WHERE 
        TABLE_TYPE = 'BASE TABLE'
    `);

    return NextResponse.json({
      success: true,
      message: 'Connected to biometric database successfully',
      sampleTable: result.recordset[0],
    });
  } catch (error: any) {
    console.error('Biometric DB connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to biometric database',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
