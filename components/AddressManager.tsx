"use client";

import { useActionState } from "react";
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from "@/app/account/actions";
import { SubmitButton } from "@/components/AccountFormControls";
import type { CustomerAddress } from "@/lib/shopify/customer-account/types";
import { INITIAL_ACCOUNT_ACTION_STATE } from "@/lib/shopify/customer-account/types";

const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

function Feedback({ state }: { state: typeof INITIAL_ACCOUNT_ACTION_STATE }) {
  if (state.status === "idle") return null;
  return <p aria-live="polite" className={`mt-3 text-sm ${state.status === "error" ? "text-red-600 dark:text-red-300" : "text-primary"}`}>{state.message}</p>;
}

function Field({ label, name, defaultValue = "", required = false, error }: { label: string; name: string; defaultValue?: string | null; required?: boolean; error?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}{required && <span aria-hidden="true"> *</span>}
      <input name={name} defaultValue={defaultValue ?? ""} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} className={fieldClass} />
      {error && <span id={`${name}-error`} className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span>}
    </label>
  );
}

function AddressFields({ address, errors = {} }: { address?: CustomerAddress; errors?: Record<string, string> }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <Field label="First name" name="firstName" defaultValue={address?.firstName} required error={errors.firstName} />
    <Field label="Last name" name="lastName" defaultValue={address?.lastName} required error={errors.lastName} />
    <Field label="Company" name="company" defaultValue={address?.company} error={errors.company} />
    <Field label="Phone (international format)" name="phoneNumber" defaultValue={address?.phoneNumber} error={errors.phoneNumber} />
    <div className="sm:col-span-2"><Field label="Address line 1" name="address1" defaultValue={address?.address1} required error={errors.address1} /></div>
    <div className="sm:col-span-2"><Field label="Address line 2" name="address2" defaultValue={address?.address2} error={errors.address2} /></div>
    <Field label="City" name="city" defaultValue={address?.city} required error={errors.city} />
    <Field label="Postcode" name="zip" defaultValue={address?.zip} required error={errors.zip} />
    <Field label="Region code" name="zoneCode" defaultValue={address?.zoneCode} error={errors.zoneCode} />
    <Field label="Country code" name="territoryCode" defaultValue={address?.territoryCode ?? "GB"} required error={errors.territoryCode} />
  </div>;
}

function AddAddressForm() {
  const [state, action] = useActionState(createAddressAction, INITIAL_ACCOUNT_ACTION_STATE);
  return <details className="rounded-xl border border-border bg-surface p-5">
    <summary className="cursor-pointer rounded font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Add a new address</summary>
    <form action={action} className="mt-5">
      <AddressFields errors={state.fieldErrors} />
      <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" name="defaultAddress" className="size-4 accent-primary" />Set as default address</label>
      <div className="mt-5"><SubmitButton idle="Add address" pending="Adding…" /></div>
      <Feedback state={state} />
    </form>
  </details>;
}

function AddressActions({ address }: { address: CustomerAddress }) {
  const [updateState, updateAction] = useActionState(updateAddressAction, INITIAL_ACCOUNT_ACTION_STATE);
  const [defaultState, defaultAction] = useActionState(setDefaultAddressAction, INITIAL_ACCOUNT_ACTION_STATE);
  const [deleteState, deleteAction] = useActionState(deleteAddressAction, INITIAL_ACCOUNT_ACTION_STATE);
  return <div className="mt-5 border-t border-border pt-4">
    <details>
      <summary className="cursor-pointer rounded text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Edit address</summary>
      <form action={updateAction} className="mt-5">
        <input type="hidden" name="addressId" value={address.id} />
        <AddressFields address={address} errors={updateState.fieldErrors} />
        {address.isDefault
          ? <><input type="hidden" name="defaultAddress" value="on" /><p className="mt-4 text-sm text-muted">This is your current default address.</p></>
          : <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" name="defaultAddress" className="size-4 accent-primary" />Set as default address</label>}
        <div className="mt-5"><SubmitButton idle="Save address" pending="Saving…" /></div>
        <Feedback state={updateState} />
      </form>
    </details>
    <div className="mt-4 flex flex-wrap gap-3">
      {!address.isDefault && <form action={defaultAction}>
        <input type="hidden" name="addressId" value={address.id} />
        <SubmitButton idle="Set as default" pending="Updating…" />
      </form>}
      {!address.isDefault && <form action={deleteAction}>
        <input type="hidden" name="addressId" value={address.id} />
        <SubmitButton idle="Remove" pending="Removing…" danger />
      </form>}
    </div>
    <Feedback state={defaultState.status !== "idle" ? defaultState : deleteState} />
  </div>;
}

export default function AddressManager({ addresses }: { addresses: CustomerAddress[] }) {
  return <div className="mt-8 space-y-4">
    <AddAddressForm />
    {addresses.length === 0 ? <section className="rounded-xl border border-border bg-surface p-8 text-center"><h2 className="text-xl font-bold">No saved addresses yet.</h2><p className="mt-2 text-muted">Add an address when you are ready.</p></section> : addresses.map((address) => (
      <article key={address.id} className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-bold">{[address.firstName, address.lastName].filter(Boolean).join(" ") || "Saved address"}</h2>
          {address.isDefault && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Default</span>}
        </div>
        <address className="mt-3 not-italic text-muted">
          {address.formatted.map((line, index) => <span key={`${line}-${index}`} className="block">{line}</span>)}
          {address.phoneNumber && <span className="mt-2 block">{address.phoneNumber}</span>}
        </address>
        <AddressActions address={address} />
      </article>
    ))}
  </div>;
}
