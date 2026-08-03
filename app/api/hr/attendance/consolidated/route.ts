import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHR } from "@/lib/roleAuth";

export async function GET(req: Request) {
  try {
    const authRes = await requireHR(req);
    if (authRes.error || !authRes.user) {
      return NextResponse.json(
        { error: authRes.error || "Unauthorized" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    // Default to current year and month if not provided
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1; // 1-12

    // Get start and end of the target month
    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const endDate = new Date(
      Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999),
    );

    const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    // Fetch all active employees
    const employees = await prisma.user.findMany({
      where: {
        // role: { not: "ADMIN" },
        employmentInfo: {
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        name: true,
        employmentInfo: {
          select: {
            clientProjectId: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        attendanceRecords: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        leaveBalance: true,
        monthlyLeaveBalances: {
          where: { year: targetYear, month: targetMonth },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const leaveSettings = await prisma.leaveSettings.findFirst();

    const calendarEvents = await prisma.projectCalendarEvent.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });

    const consolidatedData = employees.map((emp) => {
      const projId = emp.employmentInfo?.clientProjectId;
      const projectEvents = projId
        ? calendarEvents.filter((ce) => ce.clientProjectId === projId)
        : [];
      const existingDates = new Set(
        emp.attendanceRecords.map((r) => r.date.toISOString().split("T")[0]),
      );

      projectEvents.forEach((evt) => {
        const dateStr = evt.date.toISOString().split("T")[0];
        if (!existingDates.has(dateStr)) {
          if (evt.type === "HOLIDAY") {
            emp.attendanceRecords.push({
              id: `holiday_${evt.id}`,
              userId: emp.id,
              date: evt.date,
              status: "HOLIDAY",
              remarks: evt.description,
              punchIn: null,
              punchOut: null,
              createdAt: evt.date,
              updatedAt: evt.date,
            });
            existingDates.add(dateStr);
          } else if (evt.type === "DOUBLE_PAY") {
            emp.attendanceRecords.push({
              id: `doublepay_${evt.id}`,
              userId: emp.id,
              date: evt.date,
              status: "DOUBLE_PAY",
              remarks: evt.description,
              punchIn: null,
              punchOut: null,
              createdAt: evt.date,
              updatedAt: evt.date,
            });
            existingDates.add(dateStr);
          }
        }
      });

      // Recompute existingDates since we may have injected project events
      const existingDateSet = new Set(
        emp.attendanceRecords.map((r) => r.date.toISOString().split("T")[0]),
      );
      const projectEventDates = new Set(projectEvents.map((e) => e.date.toISOString().split("T")[0]));

      let present = 0;
      let late = 0;
      let holiday = 0;
      let doublePay = 0;
      let weekend = 0;

      let approvedLeave = 0;
      let unapprovedLeave = 0;
      let approvedHalfLeave = 0;
      let unapprovedHalfLeave = 0;
      let approvedLeaveWithoutPay = 0;
      let unapprovedLeaveWithoutPay = 0;
      let approvedHalfLeaveWithoutPay = 0;
      let unapprovedHalfLeaveWithoutPay = 0;

      // Count explicit records first
      emp.attendanceRecords.forEach((record) => {
        const st = (record.status || "").toUpperCase();
        // parse late weight if present in remarks (format: lateWeight=2 or just '2')
        let weight = 1;
        if (record.remarks) {
          const m = String(record.remarks).match(/lateWeight\s*=\s*(\d+)/i);
          if (m) weight = parseInt(m[1], 10) || 1;
          else {
            const n = parseInt(String(record.remarks), 10);
            if (!isNaN(n)) weight = n;
          }
        }
        switch (st) {
          case "PRESENT":
            present++;
            break;
          case "LATE":
            present++;
            late += weight;
            break;
          case "DOUBLE_PAY":
            doublePay++;
            break;
          case "APPROVED_LEAVE":
            approvedLeave++;
            break;
          case "UNAPPROVED_LEAVE":
            unapprovedLeave++;
            break;
          case "APPROVED_HALF_LEAVE":
            approvedHalfLeave++;
            break;
          case "UNAPPROVED_HALF_LEAVE":
            unapprovedHalfLeave++;
            break;
          case "APPROVED_LEAVE_WITHOUT_PAY":
            approvedLeaveWithoutPay++;
            break;
          case "UNAPPROVED_LEAVE_WITHOUT_PAY":
            unapprovedLeaveWithoutPay++;
            break;
          case "APPROVED_HALF_LEAVE_WITHOUT_PAY":
            approvedHalfLeaveWithoutPay++;
            break;
          case "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY":
            unapprovedHalfLeaveWithoutPay++;
            // count lateness contributed by this record (if it came from late conversion)
            late += weight;
            break;
          case "HOLIDAY":
            holiday++;
            break;
          case "WEEKEND":
            weekend++;
            break;
        }
      });

      // weekend is counted from explicit WEEKEND attendance records

      const takenPaidLeaves =
        approvedLeave +
        unapprovedLeave +
        (approvedHalfLeave + unapprovedHalfLeave) * 0.5;

      const hasMonthly =
        emp.monthlyLeaveBalances && emp.monthlyLeaveBalances.length > 0;

      const prevTotalLeavesLeft = hasMonthly
        ? emp.monthlyLeaveBalances[0].previousLeaves +
          emp.monthlyLeaveBalances[0].compensatoryOff
        : emp.leaveBalance
          ? emp.leaveBalance.annualLeave +
            emp.leaveBalance.compensatoryOff -
            (emp.leaveBalance.annualUsed + emp.leaveBalance.compensatoryUsed)
          : 0;

      const currentMonthLeaveToAdd = hasMonthly
        ? emp.monthlyLeaveBalances[0].currentMonthLeaves
        : leaveSettings
          ? leaveSettings.monthlyAnnualLeave
          : 0;

        const totalLeaveBank = prevTotalLeavesLeft + currentMonthLeaveToAdd;
        let payableLeaves = Math.min(takenPaidLeaves, totalLeaveBank);
        let excessLeaves = takenPaidLeaves - payableLeaves;
        let calculatedLwps = approvedLeaveWithoutPay + unapprovedLeaveWithoutPay + (approvedHalfLeaveWithoutPay + unapprovedHalfLeaveWithoutPay) * 0.5;


      const totalLeaves =
        approvedLeave +
        unapprovedLeave +
        approvedHalfLeave +
        unapprovedHalfLeave +
        approvedLeaveWithoutPay +
        unapprovedLeaveWithoutPay +
        approvedHalfLeaveWithoutPay +
        unapprovedHalfLeaveWithoutPay;
      // If employee left during the month, adjust the effective total days
      // to the day they left so payable calculation only counts until then.
      const leftRecords = emp.attendanceRecords
        .filter((r) => (r.status || "").toUpperCase() === "LEFT")
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const leftDate = leftRecords.length > 0 ? new Date(leftRecords[0].date) : null;
      const effectiveTotalDays = leftDate ? leftDate.getUTCDate() : totalDaysInMonth;

      // Compute payable days. Prefer the calendar month total when explicit
      // attendance records (present+weekend+holiday+payableLeaves) don't sum
      // to the full month (e.g., missing records). Add one extra payable day
      // per `doublePay` (worked on holiday). Finally subtract unpaid LWPs
      // (half LWPs counted as 0.5). Use effectiveTotalDays when employee left.
      const accountedDays = present + weekend + holiday + payableLeaves;
      const baselineDays = Math.max(effectiveTotalDays, accountedDays) + doublePay;
      let payableDays = baselineDays - calculatedLwps - excessLeaves;
      if (payableDays < 0) payableDays = 0;

      return {
        userId: emp.id,
        name: emp.name,
        employeeId: emp.id,
        department: emp.employmentInfo?.department?.name || "N/A",
        present,
        late,
        totalLeaves,
        prevTotalLeavesLeft,
        currentMonthLeaveToAdd,
        totalLeaveBank,
        payableLeaves,
        calculatedLwps,
        approvedLeave,
        unapprovedLeave,
        excessLeaves,
        approvedHalfLeave,
        unapprovedHalfLeave,
        approvedLeaveWithoutPay,
        unapprovedLeaveWithoutPay,
        approvedHalfLeaveWithoutPay,
        unapprovedHalfLeaveWithoutPay,
        holiday,
        doublePay,
        weekend,
        payableDays,
        totalDaysInMonth: effectiveTotalDays,
      };
    });

    return NextResponse.json({
      success: true,
      month: targetMonth,
      year: targetYear,
      data: consolidatedData,
    });
  } catch (error: any) {
    console.error("Error generating consolidated attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Lock and deduct leaves for the requested month/year. This moves remaining balance
// into next month's `MonthlyLeaveBalance.previousLeaves` and clears current month's
// `currentMonthLeaves` so the consolidated view no longer shows a separate current-month addition.
export async function POST(req: Request) {
  try {
    const authRes = await requireHR(req);
    if (authRes.error || !authRes.user) {
      return NextResponse.json({ error: authRes.error || "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1; // 1-12

    // Get start and end of the target month
    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const endDate = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    const leaveSettings = await prisma.leaveSettings.findFirst();

    // Fetch employees with attendance for that month
    const employees = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: {
        id: true,
        leaveBalance: true,
        monthlyLeaveBalances: { where: { year: targetYear, month: targetMonth } },
        attendanceRecords: { where: { date: { gte: startDate, lte: endDate } } },
      },
    });

    const ops: any[] = [];

    for (const emp of employees) {
      // Calculate taken paid leaves same as GET
      let approvedLeave = 0;
      let unapprovedLeave = 0;
      let approvedHalfLeave = 0;
      let unapprovedHalfLeave = 0;
      let approvedLeaveWithoutPay = 0;
      let unapprovedLeaveWithoutPay = 0;
      let approvedHalfLeaveWithoutPay = 0;
      let unapprovedHalfLeaveWithoutPay = 0;

      emp.attendanceRecords.forEach((record: any) => {
        switch ((record.status || "").toUpperCase()) {
          case "APPROVED_LEAVE":
            approvedLeave++;
            break;
          case "UNAPPROVED_LEAVE":
            unapprovedLeave++;
            break;
          case "APPROVED_HALF_LEAVE":
            approvedHalfLeave++;
            break;
          case "UNAPPROVED_HALF_LEAVE":
            unapprovedHalfLeave++;
            break;
          case "APPROVED_LEAVE_WITHOUT_PAY":
            approvedLeaveWithoutPay++;
            break;
          case "UNAPPROVED_LEAVE_WITHOUT_PAY":
            unapprovedLeaveWithoutPay++;
            break;
          case "APPROVED_HALF_LEAVE_WITHOUT_PAY":
            approvedHalfLeaveWithoutPay++;
            break;
          case "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY":
            unapprovedHalfLeaveWithoutPay++;
            break;
        }
      });

      const takenPaidLeaves =
        approvedLeave + unapprovedLeave + (approvedHalfLeave + unapprovedHalfLeave) * 0.5;

      const hasMonthly = emp.monthlyLeaveBalances && emp.monthlyLeaveBalances.length > 0;

      const prevTotalLeavesLeft = hasMonthly
        ? emp.monthlyLeaveBalances[0].previousLeaves + emp.monthlyLeaveBalances[0].compensatoryOff
        : emp.leaveBalance
        ? emp.leaveBalance.annualLeave + emp.leaveBalance.compensatoryOff - (emp.leaveBalance.annualUsed + emp.leaveBalance.compensatoryUsed)
        : 0;

      const currentMonthLeaveToAdd = hasMonthly
        ? emp.monthlyLeaveBalances[0].currentMonthLeaves
        : leaveSettings
        ? leaveSettings.monthlyAnnualLeave
        : 0;

      const totalLeaveBank = prevTotalLeavesLeft + currentMonthLeaveToAdd;
      const payableLeaves = Math.min(takenPaidLeaves, totalLeaveBank);
      const excessLeaves = Math.max(0, takenPaidLeaves - payableLeaves);
      const remaining = totalLeaveBank - payableLeaves;

      // For current month record: zero out currentMonthLeaves to mark it consumed
      if (hasMonthly) {
        ops.push(prisma.monthlyLeaveBalance.update({
          where: { userId_year_month: { userId: emp.id, year: targetYear, month: targetMonth } },
          data: { currentMonthLeaves: 0 },
        }));
      }

      // Upsert next month record: set previousLeaves = remaining and seed currentMonthLeaves from settings
      let nextMonth = targetMonth + 1;
      let nextYear = targetYear;
      if (nextMonth === 13) {
        nextMonth = 1;
        nextYear += 1;
      }

      ops.push(prisma.monthlyLeaveBalance.upsert({
        where: { userId_year_month: { userId: emp.id, year: nextYear, month: nextMonth } },
        update: {
          previousLeaves: remaining,
          currentMonthLeaves: leaveSettings ? leaveSettings.monthlyAnnualLeave : 0,
        },
        create: {
          userId: emp.id,
          year: nextYear,
          month: nextMonth,
          previousLeaves: remaining,
          currentMonthLeaves: leaveSettings ? leaveSettings.monthlyAnnualLeave : 0,
          compensatoryOff: 0,
        },
      }));
    }

    // execute all DB ops in a transaction
    if (ops.length > 0) await prisma.$transaction(ops);

    return NextResponse.json({ success: true, message: "Leaves locked and carried forward to next month." });
  } catch (error: any) {
    console.error("Error locking leaves:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
