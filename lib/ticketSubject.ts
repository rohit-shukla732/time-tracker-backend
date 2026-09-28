import { prisma } from '@/lib/prisma';

export interface TicketSubject {
  id: string;
  userId: string | null;
  subjectName: string | null;
  subjectEmail: string | null;
  /**
   * True when the subject is a person whose account has not been linked yet
   * (new joiner / unlinked record).
   */
  isPending: boolean;
}

interface TicketSubjectSource {
  id: string;
  createdBy: string;
  relatedEmployeeId: string | null;
  relatedName: string | null;
  relatedEmail: string | null;
}

interface TicketSubjectRow {
  id: string;
  employeeId: string | null;
  name: string | null;
  email: string | null;
  isPrimary: boolean;
}

/**
 * Load the raw TicketSubject rows for a ticket (existing users resolved to
 * their accounts, free-text joiners attached by email when an account exists).
 */
async function buildSubjects(
  rows: TicketSubjectRow[],
  createdBy: string
): Promise<TicketSubject[]> {
  if (rows.length === 0) return [];

  const resolved = await Promise.all(
    rows.map(async (row): Promise<TicketSubject | null> => {
      if (row.employeeId) {
        const user = await prisma.user.findUnique({
          where: { id: row.employeeId },
          select: { id: true, name: true, email: true },
        });
        if (user) {
          return {
            id: row.id,
            userId: user.id,
            subjectName: user.name,
            subjectEmail: user.email,
            isPending: false,
          };
        }
      }

      if (row.email) {
        const user = await prisma.user.findUnique({
          where: { email: row.email },
          select: { id: true, name: true, email: true },
        });
        if (user) {
          return {
            id: row.id,
            userId: user.id,
            subjectName: user.name,
            subjectEmail: user.email,
            isPending: false,
          };
        }
      }

      if (row.name || row.email) {
        return {
          id: row.id,
          userId: null,
          subjectName: row.name ?? row.email,
          subjectEmail: row.email ?? null,
          isPending: true,
        };
      }

      return null;
    })
  );

  const subjects = resolved.filter((s): s is TicketSubject => s !== null);

  // Fall back to the creator for tickets with no subject rows (support tickets)
  // when nothing resolved.
  if (subjects.length === 0) {
    const creator = await prisma.user.findUnique({
      where: { id: createdBy },
      select: { id: true, name: true, email: true },
    });
    return [
      {
        id: 'creator',
        userId: creator?.id ?? createdBy,
        subjectName: creator?.name ?? null,
        subjectEmail: creator?.email ?? null,
        isPending: false,
      },
    ];
  }

  return subjects;
}

/**
 * Resolve every subject a ticket is about (multi-joiner support). Tickets with
 * no subject rows resolve to the creator, matching the legacy single-subject
 * behaviour.
 */
export async function resolveTicketSubjects(
  ticket: TicketSubjectSource
): Promise<TicketSubject[]> {
  const rows = await prisma.ticketSubject.findMany({
    where: { ticketId: ticket.id },
    orderBy: { isPrimary: 'desc' },
  });
  return buildSubjects(rows, ticket.createdBy);
}

/**
 * Resolve the single primary subject for a ticket (back-compat with the legacy
 * relatedEmployee fields). Precedence:
 *  1. the primary TicketSubject row
 *  2. legacy relatedEmployeeId / relatedEmail / relatedName
 *  3. the ticket creator
 */
export async function resolveTicketSubject(
  ticket: TicketSubjectSource
): Promise<TicketSubject> {
  const primary = await prisma.ticketSubject.findFirst({
    where: { ticketId: ticket.id, isPrimary: true },
  });
  if (primary) {
    const [subject] = await buildSubjects([primary], ticket.createdBy);
    if (subject) return subject;
  }

  if (ticket.relatedEmployeeId) {
    const user = await prisma.user.findUnique({
      where: { id: ticket.relatedEmployeeId },
      select: { id: true, name: true, email: true },
    });
    if (user) {
      return {
        id: 'related',
        userId: user.id,
        subjectName: user.name,
        subjectEmail: user.email,
        isPending: false,
      };
    }
  }

  if (ticket.relatedEmail) {
    const user = await prisma.user.findUnique({
      where: { email: ticket.relatedEmail },
      select: { id: true, name: true, email: true },
    });
    if (user) {
      return {
        id: 'related',
        userId: user.id,
        subjectName: user.name,
        subjectEmail: user.email,
        isPending: false,
      };
    }
  }

  if (ticket.relatedName || ticket.relatedEmail) {
    return {
      id: 'related',
      userId: null,
      subjectName: ticket.relatedName ?? ticket.relatedEmail,
      subjectEmail: ticket.relatedEmail ?? null,
      isPending: true,
    };
  }

  const creator = await prisma.user.findUnique({
    where: { id: ticket.createdBy },
    select: { id: true, name: true, email: true },
  });
  return {
    id: 'creator',
    userId: creator?.id ?? ticket.createdBy,
    subjectName: creator?.name ?? null,
    subjectEmail: creator?.email ?? null,
    isPending: false,
  };
}