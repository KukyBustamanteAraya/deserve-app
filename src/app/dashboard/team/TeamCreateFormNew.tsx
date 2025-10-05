'use client';
import * as React from 'react';
import { useFormStatus } from 'react-dom';

type Sport = { slug: string; name: string };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="border rounded px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
      {pending ? 'Creating…' : 'Create Team'}
    </button>
  );
}

export function TeamCreateFormNew({
  sports,
  action,
}: {
  sports: Sport[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-4 max-w-md">
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="name">Team name</label>
        <input id="name" name="name" className="border rounded px-3 py-2" placeholder="Mi Equipo" required />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="sport_slug">Sport</label>
        <select id="sport_slug" name="sport_slug" required className="border rounded px-3 py-2" defaultValue="">
          <option value="" disabled>Select a sport</option>
          {sports.map((s) => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
        </select>
      </div>

      <SubmitButton />
    </form>
  );
}
