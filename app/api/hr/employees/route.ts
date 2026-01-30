import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";
import bcrypt from "bcrypt";

// GET /api/hr/employees - Get all employees with leave balances
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow HR, ADMIN, and MANAGER roles
    if (authResult.user.role !== "HR" && authResult.user.role !== "ADMIN" && authResult.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const employees = await prisma.user.findMany({
      include: {
        employmentInfo: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            designation: {
              select: {
                title: true,
              },
            },
          },
        },
        personalInfo: true,
        familyInfo: true,
        contactInfo: true,
        addressInfo: true,
        governmentID: true,
        bankDetails: true,
        leaveBalance: true,
        lateComingRecords: {
          where: {
            year: currentYear,
            month: currentMonth,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get late coming settings
    const settings = await prisma.leaveSettings.findFirst();
    const lateComingCredits = settings?.lateComingCredits || 0;

    return NextResponse.json({ 
      success: true, 
      employees,
      lateComingCredits
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST /api/hr/employees - Create a new employee with complete profile
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only HR and ADMIN can create employees
    if (authResult.user.role !== "HR" && authResult.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      name,
      email,
      password,
      role,
      personalInfo,
      contactInfo,
      addressInfo,
      governmentID,
      employmentInfo,
      bankDetails,
    } = body;

    // Validate required fields
    if (!id || !name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, email, password" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { email: email.toLowerCase() }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this ID or email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with all related data in a transaction
    const user = await prisma.$transaction(async (tx: any) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          id,
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: role || "EMPLOYEE",
        },
      });

      // Create PersonalInfo if provided
      if (personalInfo && (personalInfo.firstName || personalInfo.lastName)) {
        await tx.personalInfo.create({
          data: {
            userId: newUser.id,
            firstName: personalInfo.firstName,
            middleName: personalInfo.middleName,
            lastName: personalInfo.lastName,
            dateOfBirth: personalInfo.dateOfBirth ? new Date(personalInfo.dateOfBirth) : null,
            gender: personalInfo.gender,
          },
        });
      }

      // Create FamilyInfo if provided
      if (personalInfo?.maritalStatus) {
        await tx.familyInfo.create({
          data: {
            userId: newUser.id,
            maritalStatus: personalInfo.maritalStatus,
          },
        });
      }

      // Create ContactInfo if provided
      if (contactInfo?.primaryPhone) {
        await tx.contactInfo.create({
          data: {
            userId: newUser.id,
            primaryPhone: contactInfo.primaryPhone,
            secondaryPhone: contactInfo.secondaryPhone,
            personalEmail: contactInfo.personalEmail,
            emergencyContactName: contactInfo.emergencyContactName,
            emergencyContactPhone: contactInfo.emergencyContactPhone,
            emergencyContactRelation: contactInfo.emergencyContactRelation,
          },
        });
      }

      // Create AddressInfo if provided
      if (addressInfo && (addressInfo.currentAddress || addressInfo.permanentAddress)) {
        await tx.addressInfo.create({
          data: {
            userId: newUser.id,
            currentAddress: addressInfo.currentAddress,
            currentCity: addressInfo.currentCity,
            currentState: addressInfo.currentState,
            currentCountry: addressInfo.currentCountry || "India",
            currentZipCode: addressInfo.currentZipCode,
            permanentAddress: addressInfo.permanentAddress,
            permanentCity: addressInfo.permanentCity,
            permanentState: addressInfo.permanentState,
            permanentCountry: addressInfo.permanentCountry || "India",
            permanentZipCode: addressInfo.permanentZipCode,
          },
        });
      }

      // Create GovernmentID if provided
      if (governmentID && (governmentID.pan || governmentID.aadhaar)) {
        await tx.governmentID.create({
          data: {
            userId: newUser.id,
            pan: governmentID.pan,
            aadhaar: governmentID.aadhaar,
            passport: governmentID.passport,
            drivingLicense: governmentID.drivingLicense,
            voterID: governmentID.voterID,
          },
        });
      }

      // Create EmploymentInfo if provided
      if (employmentInfo) {
        await tx.employmentInfo.create({
          data: {
            userId: newUser.id,
            companyId: employmentInfo.companyId,
            branchId: employmentInfo.branchId,
            departmentId: employmentInfo.departmentId,
            designationId: employmentInfo.designationId,
            jobType: employmentInfo.jobType || "FULL_TIME",
            status: employmentInfo.status || "ACTIVE",
            joiningDate: employmentInfo.joiningDate ? new Date(employmentInfo.joiningDate) : null,
            confirmationDate: employmentInfo.confirmationDate ? new Date(employmentInfo.confirmationDate) : null,
            probationEndDate: employmentInfo.probationEndDate ? new Date(employmentInfo.probationEndDate) : null,
          },
        });
      }

      // Create BankDetails if provided
      if (bankDetails && bankDetails.accountNumber) {
        await tx.bankDetails.create({
          data: {
            userId: newUser.id,
            accountHolderName: bankDetails.accountHolderName,
            accountNumber: bankDetails.accountNumber,
            bankName: bankDetails.bankName,
            ifscCode: bankDetails.ifscCode,
            branchName: bankDetails.branchName,
            accountType: bankDetails.accountType || "SAVINGS",
          },
        });
      }

      // Create default leave balance for current year
      const currentYear = new Date().getFullYear();
      const settings = await tx.leaveSettings.findFirst();
      
      await tx.leaveBalance.create({
        data: {
          userId: newUser.id,
          year: currentYear,
          sickLeave: settings?.sickLeave || 12,
          casualLeave: settings?.casualLeave || 12,
          annualLeave: settings?.annualLeave || 12,
          maternityLeave: settings?.maternityLeave || 180,
          paternityLeave: settings?.paternityLeave || 15,
          compensatoryOff: 0,
          sickUsed: 0,
          casualUsed: 0,
          annualUsed: 0,
          maternityUsed: 0,
          paternityUsed: 0,
          compensatoryUsed: 0,
        },
      });

      return newUser;
    });

    // Fetch complete user data to return
    const completeUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        personalInfo: true,
        familyInfo: true,
        contactInfo: true,
        addressInfo: true,
        governmentID: true,
        employmentInfo: {
          include: {
            department: true,
            designation: true,
            company: true,
            branch: true,
          },
        },
        bankDetails: true,
        leaveBalance: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Employee created successfully",
      employee: completeUser,
    });
  } catch (error: any) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create employee" },
      { status: 500 }
    );
  }
}
