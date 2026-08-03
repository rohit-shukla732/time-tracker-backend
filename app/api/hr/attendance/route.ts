import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user || (authResult.user.role !== "HR" && authResult.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));

    // Calculate start and end date for the selected month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const employees = await prisma.user.findMany({
      where: {
        // role: { not: "ADMIN" }, // Generally show employees/managers/HR depending on needs
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        attendanceRecords: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          },
          select: {
            id: true,
            date: true,
            status: true,
            remarks: true
          }
        },
        employmentInfo: {
          select: {
            clientProjectId: true,
            department: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const calendarEvents = await prisma.projectCalendarEvent.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Inject holidays into records dynamically if they are missing
    const enrichedEmployees = employees.map(emp => {
      const projId = emp.employmentInfo?.clientProjectId;
      if (!projId) return emp;

      const projectEvents = calendarEvents.filter(ce => ce.clientProjectId === projId);
      const existingRecordDates = new Set(emp.attendanceRecords.map(r => r.date.toISOString().split('T')[0]));

      projectEvents.forEach(event => {
        const eventDateStr = event.date.toISOString().split('T')[0];
        
        // If no attendance submitted, inject the default event
        if (!existingRecordDates.has(eventDateStr)) {
          if (event.type === 'HOLIDAY') {
            emp.attendanceRecords.push({
              id: `holiday_${event.id}`,
              date: event.date,
              status: "HOLIDAY",
              remarks: event.description || "Holiday"
            });
          } else if (event.type === 'DOUBLE_PAY') {
            // Optional: you can show Double Pay on attendance map, or handle it uniquely
            emp.attendanceRecords.push({
              id: `doublepay_${event.id}`,
              date: event.date,
              status: "DOUBLE_PAY", // Custom status handled in UI
              remarks: event.description || "Double Pay Day"
            });
          }
        }
      });
      
      return emp;
    });

    return NextResponse.json({
      success: true,
      data: enrichedEmployees
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user || (authResult.user.role !== "HR" && authResult.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Helper: normalize various date inputs to a UTC-midnight Date
    const toUTCDate = (dateInput: any) => {
      if (!dateInput) return null;
      // If already a Date
      if (dateInput instanceof Date) {
        return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()));
      }
      const s = String(dateInput);
      // If input looks like YYYY-MM-DD or starts with it, parse year/month/day
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        const y = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10) - 1;
        const d = parseInt(m[3], 10);
        return new Date(Date.UTC(y, mo, d));
      }
      // Fallback to Date constructor then normalize to UTC date
      const dt = new Date(s);
      if (isNaN(dt.getTime())) return null;
      return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
    };

    // Support action-based payloads for special operations
    if (body && body.action === "persistWeekends") {
      const month = body.month || new Date().getMonth() + 1;
      const year = body.year || new Date().getFullYear();

      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0));

      // build list of weekend dates in UTC string form
      const weekendDates: string[] = [];
      for (let d = 1; d <= endDate.getUTCDate(); d++) {
        const dt = new Date(Date.UTC(year, month - 1, d));
        const dow = dt.getUTCDay();
        if (dow === 0 || dow === 6) {
          weekendDates.push(dt.toISOString().split("T")[0]);
        }
      }

      // fetch employees to create records for
      const employees = await prisma.user.findMany({ where: { role: { not: "ADMIN" }, isArchived: false }, select: { id: true } });

      const ops: any[] = [];

      for (const emp of employees) {
        for (const dateStr of weekendDates) {
          const recordDate = toUTCDate(dateStr);
          if (!recordDate) continue;

          const iso = recordDate.toISOString();
          ops.push(prisma.attendanceRecord.upsert({
            where: { userId_date: { userId: emp.id, date: iso } },
            create: { userId: emp.id, date: iso, status: "WEEKEND", remarks: null },
            update: {}, // don't change existing records
          }));
        }
      }

      if (ops.length > 0) await prisma.$transaction(ops);
      return NextResponse.json({ success: true, message: `Persisted weekends for ${month}/${year}` });
    }

    const { updates } = body;
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    // Process bulk upsert (normal save flow)
      const transactions: any[] = [];
      for (const update of updates) {
        const recordDate = toUTCDate(update.date);
        if (!recordDate) continue; // skip malformed dates

        // If client marked as EMPTY, delete any existing record for that date/user
        const iso = recordDate.toISOString();
        if ((update.status || "").toUpperCase() === "EMPTY") {
          transactions.push(prisma.attendanceRecord.deleteMany({ where: { userId: update.userId, date: iso } }));
          continue;
        }
        transactions.push(prisma.attendanceRecord.upsert({
          where: { userId_date: { userId: update.userId, date: iso } },
          create: { userId: update.userId, date: iso, status: update.status, remarks: update.remarks || null },
          update: { status: update.status, remarks: update.remarks || null },
        }));
      }

    try {
      await prisma.$transaction(transactions);
    } catch (txErr: any) {
      console.error('Attendance transaction failed:', txErr);
      return NextResponse.json({ error: txErr?.message || 'Transaction failed', details: txErr?.stack }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Attendance updated successfully" });

  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { error: "Failed to update attendance records" },
      { status: 500 }
    );
  }
}
