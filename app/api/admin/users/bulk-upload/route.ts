import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import * as XLSX from 'xlsx';

interface ExcelRow {
  empCode?: string;
  employeeCode?: string;
  emp_code?: string;
  code?: string;
  name?: string;
  email?: string;
}

// POST /api/admin/users/bulk-upload - Bulk upload users from Excel (Admin only)
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Read the file as buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; empCode: string; error: string }>,
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row (1-indexed + header row)

      // Find employee code from various possible column names
      const empCode = (
        row.empCode ||
        row.employeeCode ||
        row.emp_code ||
        row.code ||
        ''
      ).toString().trim();

      const name = (row.name || '').toString().trim();
      const email = (row.email || '').toString().trim();

      // Validate required fields
      if (!empCode) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          empCode: empCode || 'N/A',
          error: 'Employee code is required',
        });
        continue;
      }

      if (!name) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          empCode,
          error: 'Name is required',
        });
        continue;
      }

      if (!email) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          empCode,
          error: 'Email is required',
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          empCode,
          error: 'Invalid email format',
        });
        continue;
      }

      try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { id: empCode },
              { email: email },
            ],
          },
        });

        if (existingUser) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            empCode,
            error: existingUser.id === empCode 
              ? 'Employee code already exists'
              : 'Email already exists',
          });
          continue;
        }

        // Hash password (same as employee code)
        const passwordHash = await hashPassword(empCode);

        // Create user
        await prisma.user.create({
          data: {
            id: empCode,
            name,
            email,
            passwordHash,
            role: 'EMPLOYEE', // Default role
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          empCode,
          error: error.message || 'Failed to create user',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${data.length} rows: ${results.success} succeeded, ${results.failed} failed`,
      results,
    });

  } catch (error: any) {
    console.error("Error processing bulk upload:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process upload" },
      { status: 500 }
    );
  }
}
