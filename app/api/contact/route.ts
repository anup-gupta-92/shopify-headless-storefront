import { sendContactEmail } from "@/lib/contact/email";
import { createContactToken, verifyContactToken } from "@/lib/contact/security";
import { readContactValues, validateContactValues } from "@/lib/contact/validation";

const headers = { "Cache-Control": "private, no-store" };
const safeError = "Your message could not be sent right now. Please try again shortly.";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ status: "error", message: "Invalid form submission." }, { status: 415, headers });
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > 15_000) return Response.json({ status: "error", message: "Your message is too long." }, { status: 413, headers });

  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 15_000) throw new Error("too large");
    raw = JSON.parse(body);
  } catch {
    return Response.json({ status: "error", message: "Invalid form submission." }, { status: 400, headers });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return Response.json({ status: "error", message: "Invalid form submission." }, { status: 400, headers });
  }
  const submission = raw as Record<string, unknown>;
  if (typeof submission.website === "string" && submission.website.trim()) {
    // Keep automated submissions from learning which check rejected them.
    return Response.json({ status: "success", message: "Thanks — your message has been sent.", nextToken: createContactToken() }, { headers });
  }

  const verified = verifyContactToken(typeof submission.formToken === "string" ? submission.formToken : "");
  if (!verified.valid || !verified.nonce) {
    return Response.json({ status: "error", message: "This form has expired or was submitted too quickly. Please refresh the page and try again." }, { status: 400, headers });
  }
  const values = readContactValues(submission);
  if (!values) return Response.json({ status: "error", message: "Please check the information in the form." }, { status: 400, headers });
  const fieldErrors = validateContactValues(values);
  if (Object.keys(fieldErrors).length) {
    return Response.json({ status: "error", message: "Please check the highlighted fields.", fieldErrors }, { status: 400, headers });
  }
  if (!await sendContactEmail(values, verified.nonce)) {
    return Response.json({ status: "error", message: safeError }, { status: 503, headers });
  }
  return Response.json({
    status: "success",
    message: "Thanks — your message has been sent. We’ll get back to you as soon as possible.",
    nextToken: createContactToken(),
  }, { headers });
}
