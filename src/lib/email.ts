import { Resend } from "resend";
import type { Status } from "./constants";
import { STATUS_LABELS } from "./constants";

/**
 * Transactional email via Resend. The SDK client is created lazily so this
 * module can be imported (e.g. by the worker or during build) without an API
 * key. When RESEND_API_KEY is unset, emails are printed to stdout instead —
 * handy in local development.
 */

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY is not set. See .env.example.");
    }
    resend = new Resend(key);
  }
  return resend;
}

export interface ReminderEmailInput {
  to: string;
  userName: string;
  company: string;
  roleTitle: string;
  status: Status;
  note: string | null;
  detailUrl: string;
}

const STATUS_COLORS: Record<Status, string> = {
  SAVED: "#64748b",
  APPLIED: "#0284c7",
  INTERVIEWING: "#d97706",
  OFFER: "#059669",
  REJECTED: "#e11d48",
  GHOSTED: "#7c3aed",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderReminderEmail(input: ReminderEmailInput): string {
  const company = escapeHtml(input.company);
  const roleTitle = escapeHtml(input.roleTitle);
  const userName = escapeHtml(input.userName);
  const statusColor = STATUS_COLORS[input.status];
  const statusLabel = STATUS_LABELS[input.status];
  const noteBlock = input.note
    ? `<p style="margin:16px 0 0;padding:12px 16px;background:#f1f5f9;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(input.note)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Follow-up reminder</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">Time to follow up on ${roleTitle} at ${company}.</div>
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="margin-bottom:24px;">
      <span style="display:inline-block;font-size:18px;font-weight:700;color:#0f172a;">Job<span style="color:#6366f1;">Trail</span></span>
    </div>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6366f1;">Follow-up reminder</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">Time to follow up with ${company}</h1>
      <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">Hi ${userName}, you asked to be reminded about your application for <strong>${roleTitle}</strong> at <strong>${company}</strong>.</p>
      <p style="margin:16px 0 0;font-size:14px;color:#475569;">Current stage:
        <span style="display:inline-block;margin-left:4px;padding:3px 10px;border-radius:999px;background:${statusColor}1a;color:${statusColor};font-size:13px;font-weight:600;">${statusLabel}</span>
      </p>
      ${noteBlock}
      <a href="${input.detailUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Open application</a>
    </div>
    <p style="margin:24px 0 0;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">You set this reminder in JobTrail.<br>Delete the reminder on the application page to stop it.</p>
  </div>
</body>
</html>`;
}

export interface SendResult {
  delivered: boolean;
  devPreview: boolean;
}

export async function sendReminderEmail(input: ReminderEmailInput): Promise<SendResult> {
  const subject = `Follow up: ${input.roleTitle} at ${input.company}`;
  const html = renderReminderEmail(input);

  if (!process.env.RESEND_API_KEY) {
    console.log(
      `[email] RESEND_API_KEY not set — printing email instead.\n` +
        `  To:      ${input.to}\n` +
        `  Subject: ${subject}\n` +
        `  Link:    ${input.detailUrl}`,
    );
    return { delivered: false, devPreview: true };
  }

  const from = process.env.EMAIL_FROM ?? "JobTrail <onboarding@resend.dev>";
  const { error } = await getResend().emails.send({
    from,
    to: input.to,
    subject,
    html,
  });
  if (error) {
    throw new Error(`Resend rejected the email: ${error.message}`);
  }
  return { delivered: true, devPreview: false };
}
