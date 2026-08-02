import { secrets } from "base44:runtime";

/**
 * Rayma AI — shared notification helper.
 * Sends an SMS via Twilio when the user has a phone_number; falls back to email
 * (registered app users only) otherwise. Used by the smart-bill-alerts and
 * weekly-cash-flow-insight scheduled jobs.
 */

export function fmtMoney(n: number, currency?: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(Number(n || 0));
  } catch {
    return `$${Number(n || 0).toFixed(2)}`;
  }
}

function cleanPhone(raw: string): string {
  const digits = String(raw || "").replace(/[^0-9+]/g, "");
  if (!digits) return "";
  // Ensure it starts with +
  return digits.startsWith("+") ? digits : "+" + digits;
}

export async function sendTwilioSMS(to: string, body: string) {
  const sid = secrets.get("TWILIO_ACCOUNT_SID");
  const token = secrets.get("TWILIO_AUTH_TOKEN");
  const from = secrets.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from) {
    return { sent: false, reason: "twilio_not_configured" };
  }
  const toPhone = cleanPhone(to);
  if (!toPhone) return { sent: false, reason: "invalid_phone" };
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${sid}:${token}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: toPhone, From: from, Body: body }).toString(),
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      console.warn("[notifications] Twilio SMS failed:", txt);
      return { sent: false, reason: "twilio_error", detail: txt };
    }
    return { sent: true, channel: "sms" };
  } catch (e) {
    console.warn("[notifications] SMS exception:", e.message);
    return { sent: false, reason: "exception", detail: e.message };
  }
}

export async function sendEmailFallback(
  base44: any,
  toEmail: string,
  subject: string,
  body: string,
) {
  if (!toEmail) return { sent: false, reason: "no_email" };
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: toEmail,
      subject,
      body,
    });
    return { sent: true, channel: "email" };
  } catch (e) {
    console.warn("[notifications] Email failed:", e.message);
    return { sent: false, reason: "email_error", detail: e.message };
  }
}

/**
 * Notify a user: SMS first (if they have a phone), email as fallback.
 * Returns the channel used so callers can log it.
 */
export async function notifyUser(
  base44: any,
  opts: { phone?: string; email?: string; body: string; subject?: string },
) {
  const { phone, email, body, subject = "Rayma AI Update" } = opts;
  if (phone) {
    const sms = await sendTwilioSMS(phone, body);
    if (sms.sent) return sms;
    // fall through to email if SMS unavailable / failed
  }
  if (email) {
    return await sendEmailFallback(base44, email, subject, body);
  }
  return { sent: false, reason: "no_contact" };
}