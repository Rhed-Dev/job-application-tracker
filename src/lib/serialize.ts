import type { Application, Reminder, StatusEvent, User } from "@prisma/client";
import type {
  ApplicationDTO,
  PublicUserDTO,
  ReminderDTO,
  StatusEventDTO,
} from "./types";

/**
 * Server-only mappers from Prisma models to plain DTOs. Keeping these out of
 * client component files ensures @prisma/client never leaks into the browser
 * bundle.
 */

type ApplicationWithRelations = Application & {
  statusEvents?: StatusEvent[];
  reminders?: Reminder[];
};

export function toApplicationDTO(app: ApplicationWithRelations): ApplicationDTO {
  const events = app.statusEvents ?? [];
  const lastStatusAt = events.length
    ? new Date(Math.max(...events.map((e) => e.at.getTime()))).toISOString()
    : null;
  return {
    id: app.id,
    company: app.company,
    roleTitle: app.roleTitle,
    status: app.status,
    source: app.source,
    location: app.location,
    url: app.url,
    notes: app.notes,
    salaryMin: app.salaryMin,
    salaryMax: app.salaryMax,
    interviewRound: app.interviewRound,
    appliedAt: app.appliedAt?.toISOString() ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    lastStatusAt,
    pendingReminders: (app.reminders ?? []).filter((r) => !r.sent).length,
  };
}

export function toStatusEventDTO(event: StatusEvent): StatusEventDTO {
  return {
    id: event.id,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    note: event.note,
    at: event.at.toISOString(),
  };
}

export function toReminderDTO(reminder: Reminder): ReminderDTO {
  return {
    id: reminder.id,
    remindAt: reminder.remindAt.toISOString(),
    note: reminder.note,
    sent: reminder.sent,
    sentAt: reminder.sentAt?.toISOString() ?? null,
  };
}

export function toPublicUserDTO(user: User): PublicUserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
