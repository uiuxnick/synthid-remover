'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createApiKey, type CreateKeyState } from '@/app/dashboard/api-keys/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-[10px] bg-h-accent px-4 py-2 text-[16px] font-semibold text-h-accent-ink disabled:opacity-60  ">
      {pending ? 'Creating…' : 'Create key'}
    </button>
  );
}

export function CreateKeyForm() {
  const [state, action] = useFormState<CreateKeyState, FormData>(createApiKey, {});
  return (
    <div className="space-y-3">
      <form action={action} className="flex gap-2">
        <input name="name" required maxLength={60} placeholder="Key name, e.g. production" className="w-full rounded-md border border-h-line bg-transparent px-3 py-2 text-[16px] " />
        <Submit />
      </form>
      {state.error && <p role="alert" className="text-[16px] text-red-500">{state.error}</p>}
      {state.key && (
        <div role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-[16px]">
          <p className="font-medium">Copy your key now. It will not be shown again.</p>
          <code className="mt-2 block break-all rounded bg-black/10 p-2 font-mono text-[14px] ">{state.key}</code>
        </div>
      )}
    </div>
  );
}
