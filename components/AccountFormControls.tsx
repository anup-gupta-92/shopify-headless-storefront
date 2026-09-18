"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ idle, pending: pendingLabel, danger = false }: { idle: string; pending: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${danger ? "border border-red-500/50 text-red-600 dark:text-red-300" : "bg-primary text-primary-foreground"} min-h-11 rounded-lg px-4 font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? pendingLabel : idle}
    </button>
  );
}
