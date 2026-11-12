'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { changePassword, deleteAccount, updateProfile, type FormState } from '@/app/dashboard/profile/actions';

const field = 'mt-1.5 h-12 w-full rounded-[10px] border border-h-line bg-h-frag px-3.5 text-[16px] text-h-ink placeholder:text-h-muted';
const label = 'block text-[14px] font-medium';

function Submit({ children, danger }: { children: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={`h-12 rounded-[10px] px-6 text-[16px] font-semibold transition-transform active:scale-[0.99] disabled:opacity-60 ${
        danger ? 'bg-h-danger text-white' : 'bg-h-accent text-h-accent-ink'
      }`}
    >
      {pending ? 'Please wait…' : children}
    </button>
  );
}

function Notice({ state }: { state: FormState }) {
  if (state.ok) return <p role="status" className="text-[15px] font-medium text-h-ok">{state.ok}</p>;
  if (state.error) return <p role="alert" className="text-[15px] font-medium text-h-danger">{state.error}</p>;
  return null;
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return msg ? <p id={id} role="alert" className="mt-1.5 text-[14px] text-h-danger">{msg}</p> : null;
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action] = useFormState<FormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="h-card space-y-5 p-6 sm:p-7">
      <h2 className="text-[20px] font-semibold">Your details</h2>
      <div>
        <label htmlFor="p-email" className={label}>Email</label>
        <input id="p-email" className={`${field} opacity-70`} value={email} readOnly aria-describedby="p-email-hint" />
        <p id="p-email-hint" className="mt-1.5 text-[14px] text-h-muted">Your email is your login and cannot be changed here.</p>
      </div>
      <div>
        <label htmlFor="p-name" className={label}>Name</label>
        <input id="p-name" name="name" className={field} defaultValue={name} autoComplete="name" required aria-invalid={!!state.fields?.name} aria-describedby="p-name-err" />
        <FieldError id="p-name-err" msg={state.fields?.name} />
      </div>
      <div>
        <label htmlFor="p-phone" className={label}>Mobile number</label>
        <input
          id="p-phone"
          name="phone"
          className={field}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          defaultValue={phone}
          required
          aria-invalid={!!state.fields?.phone}
          aria-describedby="p-phone-hint p-phone-err"
        />
        <p id="p-phone-hint" className="mt-1.5 text-[14px] text-h-muted">Include your country code.</p>
        <FieldError id="p-phone-err" msg={state.fields?.phone} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Submit>Save changes</Submit>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useFormState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="h-card space-y-5 p-6 sm:p-7">
      <h2 className="text-[20px] font-semibold">{hasPassword ? 'Change password' : 'Set a password'}</h2>
      {!hasPassword && <p className="text-[15px] text-h-muted">You signed up with Google or an email link. Add a password to also log in with email and password.</p>}
      {hasPassword && (
        <div>
          <label htmlFor="pw-current" className={label}>Current password</label>
          <input id="pw-current" name="current" type="password" className={field} autoComplete="current-password" required aria-invalid={!!state.fields?.current} aria-describedby="pw-current-err" />
          <FieldError id="pw-current-err" msg={state.fields?.current} />
        </div>
      )}
      <div>
        <label htmlFor="pw-next" className={label}>New password</label>
        <input id="pw-next" name="next" type="password" className={field} autoComplete="new-password" required aria-invalid={!!state.fields?.next} aria-describedby="pw-next-hint pw-next-err" />
        <p id="pw-next-hint" className="mt-1.5 text-[14px] text-h-muted">At least 10 characters.</p>
        <FieldError id="pw-next-err" msg={state.fields?.next} />
      </div>
      <div>
        <label htmlFor="pw-confirm" className={label}>Repeat new password</label>
        <input id="pw-confirm" name="confirm" type="password" className={field} autoComplete="new-password" required aria-invalid={!!state.fields?.confirm} aria-describedby="pw-confirm-err" />
        <FieldError id="pw-confirm-err" msg={state.fields?.confirm} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Submit>{hasPassword ? 'Update password' : 'Set password'}</Submit>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function DeleteForm({ email }: { email: string }) {
  const [state, action] = useFormState<FormState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="h-card space-y-5 border-h-danger/40 p-6 sm:p-7">
      <h2 className="text-[20px] font-semibold">Delete account</h2>
      <p className="max-w-[60ch] text-[15px] text-h-muted">
        This permanently removes your profile, history, API keys and any unused credits. It cannot be undone.
      </p>
      <div>
        <label htmlFor="del-confirm" className={label}>Type {email} to confirm</label>
        <input id="del-confirm" name="confirm" className={field} autoComplete="off" required aria-invalid={!!state.fields?.confirm} aria-describedby="del-confirm-err" />
        <FieldError id="del-confirm-err" msg={state.fields?.confirm} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Submit danger>Delete my account</Submit>
        <Notice state={state} />
      </div>
    </form>
  );
}
