"use client";

import { useActionState } from "react";
import { saveProfileAction } from "@/app/account/actions";
import { SubmitButton } from "@/components/AccountFormControls";
import type { CustomerIdentity } from "@/lib/shopify/customer-account/types";
import { INITIAL_ACCOUNT_ACTION_STATE } from "@/lib/shopify/customer-account/types";

export default function ProfileForm({ customer }: { customer: CustomerIdentity }) {
  const [state, action] = useActionState(saveProfileAction, INITIAL_ACCOUNT_ACTION_STATE);
  const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

  return <form action={action} className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-medium">First name
        <input name="firstName" defaultValue={customer.firstName ?? ""} required aria-invalid={Boolean(state.fieldErrors?.firstName)} className={fieldClass} />
        {state.fieldErrors?.firstName && <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{state.fieldErrors.firstName}</span>}
      </label>
      <label className="text-sm font-medium">Last name
        <input name="lastName" defaultValue={customer.lastName ?? ""} required aria-invalid={Boolean(state.fieldErrors?.lastName)} className={fieldClass} />
        {state.fieldErrors?.lastName && <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{state.fieldErrors.lastName}</span>}
      </label>
      <div className="text-sm"><span className="font-medium">Email</span><p className="mt-2 break-all text-muted">{customer.emailAddress?.emailAddress || "Not supplied"}</p></div>
      <div className="text-sm"><span className="font-medium">Phone</span><p className="mt-2 text-muted">{customer.phoneNumber?.phoneNumber || "Not supplied"}</p></div>
    </div>
    <p className="mt-5 text-sm text-muted">Email, phone and sign-in details are managed by Shopify&rsquo;s hosted customer account.</p>
    <div className="mt-5"><SubmitButton idle="Save profile" pending="Saving…" /></div>
    {state.status !== "idle" && <p aria-live="polite" className={`mt-3 text-sm ${state.status === "error" ? "text-red-600 dark:text-red-300" : "text-primary"}`}>{state.message}</p>}
  </form>;
}
