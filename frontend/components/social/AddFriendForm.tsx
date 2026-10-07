'use client';

import { useActionState } from 'react';
import { UserPlus } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';
import { addFriend, type AddFriendState } from '@/app/social-actions';

export default function AddFriendForm() {
  const [state, action] = useActionState<AddFriendState, FormData>(addFriend, null);
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="code"
          required
          maxLength={20}
          autoComplete="off"
          placeholder="Code ami (ex. K7M2QX9A)"
          className="metric min-w-0 flex-1 rounded-xl border border-white/10 bg-ats-bg2 px-3 py-2 text-sm uppercase tracking-widest text-ats-text placeholder:normal-case placeholder:tracking-normal placeholder:text-ats-gray focus:border-ats-green/50 focus:outline-none"
        />
        <SubmitButton className="inline-flex items-center gap-1.5 rounded-xl bg-ats-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          <UserPlus className="h-4 w-4" />
          Ajouter
        </SubmitButton>
      </div>
      {state && (
        <p className={`text-xs ${state.ok ? 'text-ats-green-fg' : 'text-ats-red-fg'}`}>{state.message}</p>
      )}
    </form>
  );
}
