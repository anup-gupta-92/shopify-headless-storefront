"use client";

import { useActionState, useId, useState } from "react";
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from "@/app/account/actions";
import { SubmitButton } from "@/components/AccountFormControls";
import type { CustomerAddress } from "@/lib/shopify/customer-account/types";
import { INITIAL_ACCOUNT_ACTION_STATE } from "@/lib/shopify/customer-account/types";
import { COUNTRY_OPTIONS, REGION_OPTIONS } from "@/lib/shopify/customer-account/address-options";

const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

function Feedback({ state }: { state: typeof INITIAL_ACCOUNT_ACTION_STATE }) {
  if (state.status === "idle") return null;
  return <p aria-live="polite" className={`mt-3 text-sm ${state.status === "error" ? "text-red-600 dark:text-red-300" : "text-primary"}`}>{state.message}</p>;
}

function Field({ label, name, defaultValue = "", required = false, error, autoComplete, type = "text", hint, id }: { label: string; name: string; defaultValue?: string | null; required?: boolean; error?: string; autoComplete?: string; type?: string; hint?: string; id: string }) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <label htmlFor={id} className="block text-sm font-medium">
      {label}{required && <span aria-hidden="true"> *</span>}
      <input id={id} name={name} type={type} autoComplete={autoComplete} defaultValue={defaultValue ?? ""} required={required} aria-invalid={Boolean(error)} aria-describedby={descriptionId} className={fieldClass} />
      {error ? <span id={`${id}-error`} className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : hint ? <span id={`${id}-hint`} className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function AddressFields({ address, errors = {} }: { address?: CustomerAddress; errors?: Record<string, string> }) {
  const idPrefix = useId();
  const [territoryCode, setTerritoryCode] = useState(address?.territoryCode ?? "GB");
  const [zoneCode, setZoneCode] = useState(address?.zoneCode ?? "");
  const regions = REGION_OPTIONS[territoryCode];

  return <div className="grid gap-4 sm:grid-cols-2">
    <label htmlFor={`${idPrefix}-country`} className="block text-sm font-medium sm:col-span-2">
      Country/region <span aria-hidden="true">*</span>
      <select
        id={`${idPrefix}-country`}
        name="territoryCode"
        value={territoryCode}
        required
        autoComplete="country"
        aria-invalid={Boolean(errors.territoryCode)}
        aria-describedby={errors.territoryCode ? `${idPrefix}-country-error` : undefined}
        onChange={(event) => { setTerritoryCode(event.target.value); setZoneCode(""); }}
        className={fieldClass}
      >
        {COUNTRY_OPTIONS.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
      </select>
      {errors.territoryCode && <span id={`${idPrefix}-country-error`} className="mt-1 block text-xs text-red-600 dark:text-red-300">{errors.territoryCode}</span>}
    </label>
    <Field id={`${idPrefix}-first-name`} label="First name" name="firstName" autoComplete="given-name" defaultValue={address?.firstName} required error={errors.firstName} />
    <Field id={`${idPrefix}-last-name`} label="Last name" name="lastName" autoComplete="family-name" defaultValue={address?.lastName} required error={errors.lastName} />
    <div className="sm:col-span-2"><Field id={`${idPrefix}-company`} label="Company (optional)" name="company" autoComplete="organization" defaultValue={address?.company} error={errors.company} /></div>
    <div className="sm:col-span-2"><Field id={`${idPrefix}-address-1`} label="Address" name="address1" autoComplete="address-line1" defaultValue={address?.address1} required error={errors.address1} /></div>
    <div className="sm:col-span-2"><Field id={`${idPrefix}-address-2`} label="Apartment, suite, etc. (optional)" name="address2" autoComplete="address-line2" defaultValue={address?.address2} error={errors.address2} /></div>
    <Field id={`${idPrefix}-city`} label="City" name="city" autoComplete="address-level2" defaultValue={address?.city} required error={errors.city} />
    {regions ? <label htmlFor={`${idPrefix}-region`} className="block text-sm font-medium">
      Region/state/province
      <select id={`${idPrefix}-region`} name="zoneCode" value={zoneCode} autoComplete="address-level1" aria-invalid={Boolean(errors.zoneCode)} aria-describedby={errors.zoneCode ? `${idPrefix}-region-error` : undefined} onChange={(event) => setZoneCode(event.target.value)} className={fieldClass}>
        <option value="">Select a region</option>
        {regions.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}
      </select>
      {errors.zoneCode && <span id={`${idPrefix}-region-error`} className="mt-1 block text-xs text-red-600 dark:text-red-300">{errors.zoneCode}</span>}
    </label> : <label htmlFor={`${idPrefix}-region`} className="block text-sm font-medium">
      Region/state/province (optional)
      <input id={`${idPrefix}-region`} name="zoneCode" value={zoneCode} autoComplete="address-level1" onChange={(event) => setZoneCode(event.target.value)} aria-invalid={Boolean(errors.zoneCode)} aria-describedby={errors.zoneCode ? `${idPrefix}-region-error` : `${idPrefix}-region-hint`} className={fieldClass} />
      {errors.zoneCode ? <span id={`${idPrefix}-region-error`} className="mt-1 block text-xs text-red-600 dark:text-red-300">{errors.zoneCode}</span> : <span id={`${idPrefix}-region-hint`} className="mt-1 block text-xs text-muted">Use the local region abbreviation where applicable.</span>}
    </label>}
    <Field id={`${idPrefix}-postcode`} label="Postcode / ZIP" name="zip" autoComplete="postal-code" defaultValue={address?.zip} required error={errors.zip} />
    <Field id={`${idPrefix}-phone`} label="Phone number (optional)" name="phoneNumber" type="tel" autoComplete="tel" defaultValue={address?.phoneNumber} error={errors.phoneNumber} hint="Include the country calling code, for example +44 7700 900000." />
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
