import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import {
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
} from "@/lib/notificationSettings";

// GET /api/hr/notification-settings - All notification recipient settings
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const rows = await prisma.notificationSetting.findMany({
      orderBy: { eventType: "asc" },
    });
    const byEvent = new Map(rows.map((r) => [r.eventType, r]));

    const settings = NOTIFICATION_EVENT_TYPES.map((eventType) => {
      const row = byEvent.get(eventType);
      return {
        eventType,
        label: NOTIFICATION_EVENT_LABELS[eventType],
        notifyEmployee: row ? row.notifyEmployee : true,
        notifyManager: row ? row.notifyManager : true,
        notifyHR: row ? row.notifyHR : true,
        extraEmails: row ? row.extraEmails : [],
      };
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json({ error: "Failed to fetch notification settings" }, { status: 500 });
  }
}

// PUT /api/hr/notification-settings - Bulk save recipient settings
// Body: [{ eventType, notifyEmployee, notifyManager, notifyHR, extraEmails }]
export async function PUT(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "Expected an array of settings" }, { status: 400 });
    }

    for (const item of body) {
      if (!NOTIFICATION_EVENT_TYPES.includes(item.eventType)) {
        return NextResponse.json(
          { error: `Unknown event type: ${item.eventType}` },
          { status: 400 }
        );
      }
      const extraEmails = (Array.isArray(item.extraEmails) ? item.extraEmails : [])
        .map((e: string) => String(e).trim())
        .filter((e: string) => !!e)
        .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

      await prisma.notificationSetting.upsert({
        where: { eventType: item.eventType as NotificationEventType },
        update: {
          notifyEmployee: Boolean(item.notifyEmployee),
          notifyManager: Boolean(item.notifyManager),
          notifyHR: Boolean(item.notifyHR),
          extraEmails,
        },
        create: {
          eventType: item.eventType as NotificationEventType,
          notifyEmployee: Boolean(item.notifyEmployee),
          notifyManager: Boolean(item.notifyManager),
          notifyHR: Boolean(item.notifyHR),
          extraEmails,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving notification settings:", error);
    return NextResponse.json({ error: "Failed to save notification settings" }, { status: 500 });
  }
}
