import { prisma } from "./prisma";

export type NotificationEventType =
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "LEAVE_CANCELLED";

export interface NotificationRecipients {
  employee: boolean;
  manager: boolean;
  hr: boolean;
  extraEmails: string[];
}

export const NOTIFICATION_EVENT_TYPES: NotificationEventType[] = [
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "LEAVE_CANCELLED",
];

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  LEAVE_APPROVED: "Leave approved",
  LEAVE_REJECTED: "Leave rejected",
  LEAVE_CANCELLED: "Leave cancelled",
};

const DEFAULTS: Record<NotificationEventType, NotificationRecipients> = {
  LEAVE_APPROVED: { employee: true, manager: true, hr: true, extraEmails: [] },
  LEAVE_REJECTED: { employee: true, manager: false, hr: false, extraEmails: [] },
  LEAVE_CANCELLED: { employee: false, manager: true, hr: true, extraEmails: [] },
};

/**
 * Returns the configured recipient preferences for an event type.
 * Falls back to defaults if no row exists yet.
 */
export async function getNotificationSetting(
  eventType: NotificationEventType
): Promise<NotificationRecipients> {
  try {
    const row = await prisma.notificationSetting.findUnique({
      where: { eventType },
    });
    if (!row) return DEFAULTS[eventType];
    return {
      employee: row.notifyEmployee,
      manager: row.notifyManager,
      hr: row.notifyHR,
      extraEmails: row.extraEmails || [],
    };
  } catch (error) {
    console.error(`Failed to load notification setting ${eventType}:`, error);
    return DEFAULTS[eventType];
  }
}
