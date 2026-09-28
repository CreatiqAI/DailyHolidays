"use client";

import { signIn } from "@/app/admin/actions";
import { ActionForm, Status, SubmitButton, input, label } from "@/components/admin/ui";

export function LoginForm() {
  return (
    <ActionForm action={signIn} className="space-y-4">
      {(state) => (
        <>
          <label className="block">
            <span className={label}>Username or email</span>
            <input name="email" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} className={input} />
          </label>
          <label className="block">
            <span className={label}>Password</span>
            <input name="password" type="password" required autoComplete="current-password" className={input} />
          </label>
          <SubmitButton className="w-full">Sign in</SubmitButton>
          <Status state={state} />
        </>
      )}
    </ActionForm>
  );
}
