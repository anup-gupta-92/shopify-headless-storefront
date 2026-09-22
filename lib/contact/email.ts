import "server-only";
import { Resend } from "resend";
import type { ContactValues } from "./validation";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export async function sendContactEmail(values: ContactValues, nonce: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!key || !from || !to) {
    console.error("Contact email configuration missing", { operation: "sendContactEmail", timestamp: new Date().toISOString() });
    return false;
  }

  const timestamp = new Date().toISOString();
  const rows = [
    ["Name", values.name], ["Email", values.email], ["Phone", values.phone],
    ["Company", values.company], ["Order number", values.orderNumber],
    ["Subject", values.subject], ["Message", values.message],
    ["Submission timestamp", timestamp], ["Source", "Website contact form"],
  ];
  const text = rows.map(([label, value]) => `${label}: ${value || "Not provided"}`).join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;color:#172033"><h1>Website enquiry</h1><table style="border-collapse:collapse;width:100%">${rows.map(([label, value]) => `<tr><th scope="row" style="text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #d8dee8;width:150px">${escapeHtml(label)}</th><td style="padding:10px;border-bottom:1px solid #d8dee8;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(value || "Not provided")}</td></tr>`).join("")}</table></div>`;

  try {
    const { data, error } = await new Resend(key).emails.send({
      from: `Apex Website <${from}>`, to: [to], replyTo: values.email,
      subject: `[Website Enquiry] ${values.subject}`, html, text,
    }, { idempotencyKey: `contact/${nonce}` });
    if (error || !data?.id) {
      console.error("Contact email provider rejected request", {
        operation: "sendContactEmail", timestamp,
        code: error?.name ?? "missing_id", status: error && "statusCode" in error ? error.statusCode : undefined,
      });
      return false;
    }
    return true;
  } catch {
    console.error("Contact email provider unavailable", { operation: "sendContactEmail", timestamp });
    return false;
  }
}
