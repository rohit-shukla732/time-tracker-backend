import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow HR, ADMIN, and MANAGER roles
    if (authResult.user.role !== 'HR' && authResult.user.role !== 'ADMIN' && authResult.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        employmentInfo: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
                code: true,
                manager: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            designation: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow HR and ADMIN roles to edit
    if (authResult.user.role !== 'HR' && authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      // Personal Info
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      maritalStatus,
      nationality,
      bloodGroup,
      pronoun,
      
      // Contact Info
      alternateEmail,
      phoneNumber,
      alternatePhoneNumber,
      
      // Address Info
      residentialAddress,
      permanentAddress,
      
      // Government ID
      panCardNumber,
      aadharCardNumber,
      
      // Bank Details
      bankName,
      accountNumber,
      ifscCode,
      beneficiaryName,
      
      // Employment Info
      jobType,
      status,
      joiningDate,
      probationEndDate,
      departmentId,
      designationId,
    } = body;

    // Normalize enum values to ensure they match Prisma schema
    const normalizeGender = (val: string | null | undefined) => {
      if (!val) return null;
      const upper = val.toUpperCase();
      if (['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(upper)) return upper;
      return null;
    };

    const normalizeMaritalStatus = (val: string | null | undefined) => {
      if (!val) return null;
      const upper = val.toUpperCase();
      if (['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'].includes(upper)) return upper;
      return null;
    };

    const normalizeJobType = (val: string | null | undefined) => {
      if (!val) return null;
      const upper = val.toUpperCase();
      if (['FULL_TIME', 'PART_TIME', 'CONTRACTUAL', 'INTERN'].includes(upper)) return upper;
      return null;
    };

    const normalizeEmployeeStatus = (val: string | null | undefined) => {
      if (!val) return null;
      const upper = val.toUpperCase();
      if (['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'RESIGNED', 'TERMINATED', 'RETIRED', 'ABSCONDED'].includes(upper)) return upper;
      return 'ACTIVE'; // Default to ACTIVE if invalid
    };

    // Update user and related info in transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedEmployee = await prisma.$transaction(async (tx: any) => {
      // Update or create PersonalInfo
      await tx.personalInfo.upsert({
        where: { userId: id },
        create: {
          userId: id,
          firstName,
          middleName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: normalizeGender(gender),
          pronoun,
        },
        update: {
          firstName,
          middleName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: normalizeGender(gender),
          pronoun,
        },
      });

      // Update or create FamilyInfo
      await tx.familyInfo.upsert({
        where: { userId: id },
        create: {
          userId: id,
          maritalStatus: normalizeMaritalStatus(maritalStatus),
        },
        update: {
          maritalStatus: normalizeMaritalStatus(maritalStatus),
        },
      });

      // Update or create ContactInfo
      await tx.contactInfo.upsert({
        where: { userId: id },
        create: {
          userId: id,
          email: (await tx.user.findUnique({ where: { id } }))?.email || '',
          alternateEmail,
          phoneNumber,
          alternatePhoneNumber,
        },
        update: {
          alternateEmail,
          phoneNumber,
          alternatePhoneNumber,
        },
      });

      // Update or create AddressInfo
      await tx.addressInfo.upsert({
        where: { userId: id },
        create: {
          userId: id,
          residentialAddress,
          permanentAddress,
        },
        update: {
          residentialAddress,
          permanentAddress,
        },
      });

      // Update or create GovernmentID
      await tx.governmentID.upsert({
        where: { userId: id },
        create: {
          userId: id,
          panCardNumber,
          aadharCardNumber,
        },
        update: {
          panCardNumber,
          aadharCardNumber,
        },
      });

      // Update or create BankDetails
      if (bankName && accountNumber && ifscCode && beneficiaryName) {
        await tx.bankDetails.upsert({
          where: { userId: id },
          create: {
            userId: id,
            bankName,
            accountNumber,
            ifscCode,
            beneficiaryName,
          },
          update: {
            bankName,
            accountNumber,
            ifscCode,
            beneficiaryName,
          },
        });
      }

      // Update or create EmploymentInfo
      await tx.employmentInfo.upsert({
        where: { userId: id },
        create: {
          userId: id,
          jobType: normalizeJobType(jobType),
          status: normalizeEmployeeStatus(status),
          joiningDate: joiningDate ? new Date(joiningDate) : null,
          probationEndDate: probationEndDate ? new Date(probationEndDate) : null,
          departmentId: departmentId || null,
          designationId: designationId || null,
        },
        update: {
          jobType: normalizeJobType(jobType),
          status: normalizeEmployeeStatus(status),
          joiningDate: joiningDate ? new Date(joiningDate) : null,
          probationEndDate: probationEndDate ? new Date(probationEndDate) : null,
          departmentId: departmentId || null,
          designationId: designationId || null,
        },
      });

      // Update user's name
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          name: `${firstName} ${lastName}`,
        },
        include: {
          personalInfo: true,
          contactInfo: true,
          addressInfo: true,
          bankDetails: true,
          governmentID: true,
          employmentInfo: {
            include: {
              department: true,
              designation: true,
            },
          },
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authResult.user.role !== 'HR' && authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Delete all related records in a transaction
    await prisma.$transaction([
      prisma.employmentInfo.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
