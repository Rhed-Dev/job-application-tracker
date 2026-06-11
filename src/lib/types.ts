import type { Source, Status } from "./constants";

/**
 * Plain serializable DTOs passed from server components to client components.
 * Dates are ISO strings so they survive the RSC boundary unchanged.
 */

export interface ApplicationDTO {
  id: string;
  company: string;
  roleTitle: string;
  status: Status;
  source: Source;
  location: string | null;
  url: string | null;
  notes: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  interviewRound: number;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Timestamp of the most recent StatusEvent, i.e. when the current stage began. */
  lastStatusAt: string | null;
  /** Number of unsent reminders attached to this application. */
  pendingReminders: number;
}

export interface StatusEventDTO {
  id: string;
  fromStatus: Status | null;
  toStatus: Status;
  note: string | null;
  at: string;
}

export interface ReminderDTO {
  id: string;
  remindAt: string;
  note: string | null;
  sent: boolean;
  sentAt: string | null;
}

export interface PublicUserDTO {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AdminUserDTO extends PublicUserDTO {
  active: boolean;
  createdAt: string;
  applicationCount: number;
  hasPassword: boolean;
  providers: string[];
}
