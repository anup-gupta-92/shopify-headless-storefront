export const CONTACT_SUBJECTS = [
  "Product enquiry",
  "Order enquiry",
  "Delivery enquiry",
  "Returns / refund",
  "Business / trade enquiry",
  "General enquiry",
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];
export type ContactField = "name" | "email" | "phone" | "company" | "orderNumber" | "subject" | "message";

export interface ContactValues {
  name: string;
  email: string;
  phone: string;
  company: string;
  orderNumber: string;
  subject: string;
  message: string;
}

const FIELDS: ContactField[] = ["name", "email", "phone", "company", "orderNumber", "subject", "message"];

export function readContactValues(source: Record<string, unknown>): ContactValues | null {
  const values = {} as ContactValues;
  for (const field of FIELDS) {
    const raw = source[field];
    if (raw !== undefined && typeof raw !== "string") return null;
    values[field] = typeof raw === "string" ? raw.trim() : "";
  }
  return values;
}

export function validateContactValues(values: ContactValues): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {};
  if (values.name.length < 2 || values.name.length > 120 || /[\r\n<>]/.test(values.name)) errors.name = "Enter a name between 2 and 120 characters.";
  if (values.email.length > 254 || !/^[^\s@\r\n<>]+@[^\s@\r\n<>]+\.[^\s@\r\n<>]+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (!CONTACT_SUBJECTS.includes(values.subject as ContactSubject)) errors.subject = "Choose a subject from the list.";
  if (values.message.length < 20 || values.message.length > 5000) errors.message = "Enter a message between 20 and 5,000 characters.";
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(values.message)) errors.message = "Remove unsupported characters from the message.";
  if (values.phone && (values.phone.length > 30 || !/^[+\d() .-]+$/.test(values.phone))) errors.phone = "Enter a valid phone number, or leave this blank.";
  if (values.company.length > 120 || /[\r\n<>]/.test(values.company)) errors.company = "Company must be 120 characters or fewer on one line.";
  if (values.orderNumber.length > 80 || /[\r\n<>]/.test(values.orderNumber)) errors.orderNumber = "Order number must be 80 characters or fewer on one line.";
  return errors;
}
