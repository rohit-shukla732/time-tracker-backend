import { prisma } from "./prisma";
import { emailService } from "./emailService";
import { splitPaidUnpaid } from "./leaveUtils";
import {
  getNotificationSetting,
  type NotificationEventType,
  type NotificationRecipients,
} from "./notificationSettings";

interface LeavePayload {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  reason: string;
  isWithoutPay: boolean;
  halfDayDays?: unknown;
  withoutPayDays?: unknown;
  leaveType: { name: string };
}

interface LeaveUserPayload extends LeavePayload {
  user: { id: string; name: string; email: string; role: string };
  approver: { id: string; name: string } | null;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDates(start: Date, end: Date): string {
  return start.getTime() === end.getTime()
    ? formatDate(start)
    : `${formatDate(start)} → ${formatDate(end)}`;
}

interface LeaveEmailRow {
  label: string;
  value: string;
  accent?: string;
}

function buildLeaveEmail(opts: {
  headerSubtitle: string;
  accentColor: string;
  greeting: string;
  intro: string;
  rows: LeaveEmailRow[];
  note: string;
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f5f7fa; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #18181b; padding: 24px 32px;">
          <div style="color: #ffffff; font-size: 18px; font-weight: 700;">ACE Healthcare Solutions</div>
          <div style="color: #a1a1aa; font-size: 12px; margin-top: 4px;">${opts.headerSubtitle}</div>
        </div>
        <div style="padding: 32px;">
          <p style="margin: 0 0 4px; color: #6b7280; font-size: 13px;">${opts.greeting}</p>
          <p style="margin: 0 0 20px; color: #18181b; font-size: 15px; line-height: 1.6;">${opts.intro}</p>
          <div style="background: #f9fafb; border-left: 4px solid ${opts.accentColor}; padding: 20px 24px; border-radius: 8px;">
            ${opts.rows
              .map(
                (r) => `
              <div style="display: flex; padding: 6px 0;">
                <span style="font-weight: 600; color: #6b7280; min-width: 130px; font-size: 13px;">${r.label}</span>
                <span style="color: ${r.accent || "#111827"}; font-size: 13px; font-weight: ${r.accent ? "600" : "400"};">${r.value}</span>
              </div>`
              )
              .join("")}
          </div>
          <p style="margin: 20px 0 0; color: #6b7280; font-size: 12px; line-height: 1.6;">${opts.note}</p>
        </div>
        <div style="background: #18181b; padding: 20px 32px; text-align: center; color: #a1a1aa; font-size: 11px;">
          This is an automated message from the Leave Management System.<br>
          © ${new Date().getFullYear()} ACE Healthcare Solutions. All rights reserved.
        </div>
      </div>
    </div>
  `;
}

async function getRoleEmails(): Promise<{ manager: string | null; hr: string[] }> {
  const hrUsers = await prisma.user.findMany({
    where: { role: { in: ["HR", "ADMIN"] }, isArchived: false },
    select: { email: true },
  });
  return {
    manager: null,
    hr: hrUsers.map((h) => h.email).filter((e): e is string => !!e),
  };
}

async function getManagerEmail(userId: string): Promise<string | null> {
  const employee = await prisma.user.findUnique({
    where: { id: userId },
    select: { manager: { select: { email: true } } },
  });
  return employee?.manager?.email || null;
}

function leaveRows(p: LeavePayload, employeeName?: string) {
  const rows: LeaveEmailRow[] = [
    { label: "Leave Type", value: p.leaveType.name },
    { label: "Dates", value: formatDates(p.startDate, p.endDate) },
    { label: "Duration", value: `${p.durationDays} day(s)` },
  ];
  if (employeeName) rows.unshift({ label: "Employee", value: employeeName });
  const { withoutPay } = splitPaidUnpaid(p);
  if (withoutPay > 0) {
    rows.push({
      label: "Pay Status",
      value:
        withoutPay === p.durationDays
          ? "Without Pay"
          : `Partially Without Pay (${withoutPay} day(s))`,
      accent: "#d97706",
    });
  }
  return rows;
}

async function buildStaffRecipients(
  userId: string,
  setting: NotificationRecipients
): Promise<string[]> {
  const [managerEmail, roleEmails] = await Promise.all([
    getManagerEmail(userId),
    getRoleEmails(),
  ]);
  const list: string[] = [];
  if (setting.manager && managerEmail) list.push(managerEmail);
  if (setting.hr) list.push(...roleEmails.hr);
  list.push(...setting.extraEmails);
  return [...new Set(list.map((e) => e.trim()).filter((e) => !!e))];
}

async function sendToAll(emails: string[], subject: string, body: string) {
  await Promise.allSettled(
    emails.map((to) => emailService.sendEmail({ to, subject, body }))
  );
}

/**
 * Emails fired after a request is approved:
 *  - employee: their leave was approved (if enabled)
 *  - manager + HR + extra emails: this employee will be on leave (if enabled)
 */
export async function notifyLeaveApproved(p: LeaveUserPayload) {
  const setting = await getNotificationSetting("LEAVE_APPROVED");
  const dates = formatDates(p.startDate, p.endDate);

  const employeeBody = buildLeaveEmail({
    headerSubtitle: "Leave Approved",
    accentColor: "#10b981",
    greeting: `Hi ${p.user.name},`,
    intro: `Your leave request has been <strong style="color: #10b981;">approved</strong>. Have a great time off!`,
    rows: leaveRows(p),
    note: "This leave has been recorded on your attendance calendar. You can cancel it from My Leaves if your plans change.",
  });

  const staffBody = buildLeaveEmail({
    headerSubtitle: "Leave Notice",
    accentColor: "#10b981",
    greeting: "Hello,",
    intro: `The following employee will be <strong style="color: #10b981;">on leave</strong>:`,
    rows: leaveRows(p, p.user.name),
    note: "The attendance calendar has been updated automatically. No further action is needed.",
  });

  const jobs: Promise<unknown>[] = [];
  if (setting.employee) {
    jobs.push(
      emailService.sendEmail({
        to: p.user.email,
        subject: `Leave Approved: ${p.leaveType.name} (${dates})`,
        body: employeeBody,
      })
    );
  }
  const staffRecipients = await buildStaffRecipients(p.userId, setting);
  if (staffRecipients.length > 0) {
    jobs.push(
      sendToAll(
        staffRecipients,
        `On Leave: ${p.user.name} — ${p.leaveType.name} (${dates})`,
        staffBody
      )
    );
  }

  const results = await Promise.allSettled(jobs);
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`Failed to send approval email #${i}:`, r.reason);
    }
  });
}

/**
 * Emails the employee when a request is rejected, plus anyone enabled in settings.
 */
export async function notifyLeaveRejected(p: LeaveUserPayload, comment: string | null) {
  const setting = await getNotificationSetting("LEAVE_REJECTED");
  const dates = formatDates(p.startDate, p.endDate);
  const approverName = p.approver?.name || "Your manager";

  const body = buildLeaveEmail({
    headerSubtitle: "Leave Rejected",
    accentColor: "#ef4444",
    greeting: `Hi ${p.user.name},`,
    intro: `Unfortunately, your leave request has been <strong style="color: #ef4444;">rejected</strong> by ${approverName}.`,
    rows: [
      ...leaveRows(p),
      {
        label: "Reason",
        value: comment || "No comment provided.",
        accent: "#b91c1c",
      },
    ],
    note: "If you believe this was a mistake, please contact your manager or HR.",
  });

  const jobs: Promise<unknown>[] = [];
  if (setting.employee) {
    jobs.push(
      emailService.sendEmail({
        to: p.user.email,
        subject: `Leave Rejected: ${p.leaveType.name} (${dates})`,
        body,
      })
    );
  }
  const staffRecipients = await buildStaffRecipients(p.userId, setting);
  if (staffRecipients.length > 0) {
    jobs.push(
      sendToAll(
        staffRecipients,
        `Leave Rejected: ${p.user.name} — ${p.leaveType.name} (${dates})`,
        body
      )
    );
  }

  await Promise.allSettled(jobs);
}

/**
 * Notify recipients (per settings) that a leave request was cancelled.
 */
export async function notifyLeaveCancelled(p: LeaveUserPayload) {
  try {
    const setting = await getNotificationSetting("LEAVE_CANCELLED");
    const dates = formatDates(p.startDate, p.endDate);

    const body = buildLeaveEmail({
      headerSubtitle: "Leave Cancellation Notice",
      accentColor: "#ef4444",
      greeting: "Hello,",
      intro: `The following leave request has been <strong style="color: #ef4444;">cancelled</strong>:`,
      rows: leaveRows(p, p.user.name),
      note: "The leave has been removed from the attendance calendar. No further action is needed.",
    });

    const jobs: Promise<unknown>[] = [];
    if (setting.employee) {
      jobs.push(
        emailService.sendEmail({
          to: p.user.email,
          subject: `Leave Cancelled: ${p.leaveType.name} (${dates})`,
          body: buildLeaveEmail({
            headerSubtitle: "Leave Cancellation Notice",
            accentColor: "#ef4444",
            greeting: `Hi ${p.user.name},`,
            intro: `Your leave request has been <strong style="color: #ef4444;">cancelled</strong>.`,
            rows: leaveRows(p),
            note: "This leave has been removed from the attendance calendar.",
          }),
        })
      );
    }
    const staffRecipients = await buildStaffRecipients(p.userId, setting);
    if (staffRecipients.length > 0) {
      jobs.push(
        sendToAll(
          staffRecipients,
          `Leave Cancelled: ${p.user.name} — ${p.leaveType.name} (${dates})`,
          body
        )
      );
    }

    await Promise.allSettled(jobs);
  } catch (error) {
    console.error("Failed to send leave cancellation notifications:", error);
  }
}

export type { NotificationEventType };
