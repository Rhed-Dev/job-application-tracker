import { z } from "zod";
import { SOURCES, STATUSES } from "./constants";

/** zod schemas validating every API boundary. */

const emailField = z.string().trim().toLowerCase().email("Enter a valid email");
const nameField = z.string().trim().min(1, "Name is required").max(80);

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

const optionalTrimmed = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((v) => (v ? v : null));

const optionalUrl = z
  .union([z.string().trim().url("Enter a valid URL").max(500), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v ? v : null));

const salaryField = z
  .union([z.number().int().min(0).max(100_000_000), z.null(), z.undefined()])
  .transform((v) => v ?? null);

const applicationFields = {
  company: z.string().trim().min(1, "Company is required").max(120),
  roleTitle: z.string().trim().min(1, "Role title is required").max(120),
  location: optionalTrimmed(120),
  source: z.enum(SOURCES),
  url: optionalUrl,
  notes: optionalTrimmed(5000),
  salaryMin: salaryField,
  salaryMax: salaryField,
};

const salaryRangeCheck = <
  T extends { salaryMin: number | null; salaryMax: number | null },
>(
  data: T,
) =>
  data.salaryMin === null || data.salaryMax === null || data.salaryMax >= data.salaryMin;

export const applicationCreateSchema = z
  .object({ ...applicationFields, status: z.enum(STATUSES).default("SAVED") })
  .refine(salaryRangeCheck, {
    message: "Max salary must be greater than or equal to min salary",
    path: ["salaryMax"],
  });

export const applicationUpdateSchema = z
  .object(applicationFields)
  .partial()
  .transform((data) =>
    Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  )
  .pipe(
    z
      .object(applicationFields)
      .partial()
      .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" }),
  );

export const statusChangeSchema = z.object({
  toStatus: z.enum(STATUSES),
  note: optionalTrimmed(500),
});

export const reminderCreateSchema = z.object({
  remindAt: z.coerce
    .date()
    .refine((d) => !Number.isNaN(d.getTime()), "Invalid date")
    .refine((d) => d.getTime() > Date.now(), "Reminder must be in the future"),
  note: optionalTrimmed(500),
});

export const profileUpdateSchema = z.object({
  name: nameField,
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
});

export const adminUserUpdateSchema = z.object({
  active: z.boolean(),
});
