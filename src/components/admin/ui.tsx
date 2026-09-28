"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { ActionResult } from "@/lib/admin";

export { input, label } from "./styles";

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-navy-800 text-white hover:bg-navy-700",
    secondary: "bg-white text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50",
    danger: "bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${styles} ${className}`}
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Status({ state }: { state: ActionResult }) {
  // each submission returns a new object; hide a success message once it has been shown for a while
  const [dismissed, setDismissed] = useState<ActionResult>(null);
  useEffect(() => {
    if (!state?.ok) return;
    const t = setTimeout(() => setDismissed(state), 4000);
    return () => clearTimeout(t);
  }, [state]);
  if (!state || state === dismissed) return null;
  return state.ok ? (
    <span className="inline-flex items-center gap-1 text-sm text-green-700"><CircleCheck className="size-4" /> {state.message ?? "Saved"}</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm text-red-600"><CircleAlert className="size-4" /> {state.error}</span>
  );
}

/**
 * A form bound to a server action returning ActionResult, with an inline status message.
 * React resets the fields to their defaultValue after each submit (fresh data arrives via revalidation).
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: (state: ActionResult) => ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children(state)}
    </form>
  );
}

/** Button that runs a server action after a confirm() prompt. */
export function ConfirmButton({
  action,
  message,
  children,
  className = "",
}: {
  action: () => Promise<void>;
  message: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <SubmitButton variant="danger" className={className}>{children}</SubmitButton>
    </form>
  );
}
