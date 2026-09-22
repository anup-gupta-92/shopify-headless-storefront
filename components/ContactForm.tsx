"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CONTACT_SUBJECTS, type ContactField, type ContactValues } from "@/lib/contact/validation";

const INITIAL_VALUES: ContactValues = { name: "", email: "", phone: "", company: "", orderNumber: "", subject: "", message: "" };
interface ContactResult {
  status: "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<ContactField, string>>;
  nextToken?: string | null;
}
const inputClass = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function ContactForm({ initialToken }: { initialToken: string | null }) {
  const [values, setValues] = useState<ContactValues>(INITIAL_VALUES);
  const [token, setToken] = useState(initialToken ?? "");
  const [state, setState] = useState<ContactResult | null>(null);
  const [pending, setPending] = useState(false);
  const submittingRef = useRef(false);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state) noticeRef.current?.focus();
  }, [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || !token) return;
    submittingRef.current = true;
    setPending(true);
    setState(null);
    const website = new FormData(event.currentTarget).get("website");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, formToken: token, website }),
        cache: "no-store",
      });
      const result = await response.json() as ContactResult;
      if (result.status !== "success" && result.status !== "error") throw new Error("Invalid response");
      setState(result);
      if (result.status === "success") {
        setValues(INITIAL_VALUES);
        if (result.nextToken) setToken(result.nextToken);
      }
    } catch {
      setState({ status: "error", message: "Your message could not be sent right now. Please try again shortly." });
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  function update(field: ContactField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function errorFor(field: ContactField) {
    return state?.status === "error" ? state.fieldErrors?.[field] : undefined;
  }

  function field(name: ContactField, label: string, options: { required?: boolean; type?: string; autoComplete?: string; maxLength?: number; placeholder?: string } = {}) {
    const error = errorFor(name);
    return <div className="min-w-0">
      <label htmlFor={`contact-${name}`} className="block text-sm font-semibold">{label}{options.required && <span aria-hidden="true"> *</span>}</label>
      <input id={`contact-${name}`} name={name} type={options.type ?? "text"} value={values[name]} onChange={(event) => update(name, event.target.value)} required={options.required} autoComplete={options.autoComplete} maxLength={options.maxLength} placeholder={options.placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `contact-${name}-error` : undefined} className={inputClass} />
      {error && <p id={`contact-${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>}
    </div>;
  }

  return <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-6" aria-busy={pending}>
    <div className="absolute left-[-10000px] top-auto size-px overflow-hidden" aria-hidden="true">
      <label htmlFor="contact-website">Leave this field empty</label>
      <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
    <div className="grid gap-5 sm:grid-cols-2">
      {field("name", "Name", { required: true, autoComplete: "name", maxLength: 120, placeholder: "Your name" })}
      {field("email", "Email", { required: true, type: "email", autoComplete: "email", maxLength: 254, placeholder: "you@example.com" })}
      {field("phone", "Phone (optional)", { type: "tel", autoComplete: "tel", maxLength: 30 })}
      {field("company", "Company (optional)", { autoComplete: "organization", maxLength: 120 })}
    </div>
    {field("orderNumber", "Order number (optional)", { maxLength: 80, placeholder: "If your enquiry is about an order" })}
    <div>
      <label htmlFor="contact-subject" className="block text-sm font-semibold">Subject <span aria-hidden="true">*</span></label>
      <select id="contact-subject" name="subject" value={values.subject} onChange={(event) => update("subject", event.target.value)} required aria-invalid={Boolean(errorFor("subject"))} aria-describedby={errorFor("subject") ? "contact-subject-error" : undefined} className={inputClass}>
        <option value="">Choose a subject</option>
        {CONTACT_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
      </select>
      {errorFor("subject") && <p id="contact-subject-error" className="mt-1 text-sm text-red-600 dark:text-red-300">{errorFor("subject")}</p>}
    </div>
    <div>
      <label htmlFor="contact-message" className="block text-sm font-semibold">Message <span aria-hidden="true">*</span></label>
      <textarea id="contact-message" name="message" value={values.message} onChange={(event) => update("message", event.target.value)} required minLength={20} maxLength={5000} rows={7} placeholder="Tell us how we can help…" aria-invalid={Boolean(errorFor("message"))} aria-describedby={errorFor("message") ? "contact-message-error" : "contact-message-hint"} className={`${inputClass} resize-y`} />
      {errorFor("message") ? <p id="contact-message-error" className="mt-1 text-sm text-red-600 dark:text-red-300">{errorFor("message")}</p> : <p id="contact-message-hint" className="mt-1 text-xs text-muted">At least 20 characters.</p>}
    </div>
    <p className="text-sm leading-relaxed text-muted">By submitting this form, you agree that we may use your details to respond to your enquiry.</p>
    <button type="submit" disabled={pending || !token} className="min-h-12 rounded-xl bg-primary px-7 py-3 font-bold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Sending…" : "Send message"}</button>
    {!token && <p className="text-sm text-muted">The contact form is temporarily unavailable. Please email us directly.</p>}
    {state && <p ref={noticeRef} tabIndex={-1} role={state.status === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm font-medium focus:outline-none ${state.status === "success" ? "border-primary/40 bg-primary/10 text-foreground" : "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300"}`}>{state.message}</p>}
  </form>;
}
