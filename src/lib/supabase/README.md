# Supabase Client Usage Guide

## 📋 Which Client Should I Use?

### ✅ Server Components & API Routes (Recommended)
```typescript
import { createSupabaseServer } from '@/lib/supabase/server-client';

// In API route or Server Component
const supabase = createSupabaseServer();
const { data } = await supabase.from('teams').select('*');
```

**Use When:**
- API Routes (`src/app/api/**/route.ts`)
- Server Components (RSC)
- Server Actions

**Features:**
- Respects RLS (Row Level Security)
- Uses user's authentication context
- Cookie-based session management

---

### 🔧 Admin/Service Operations
```typescript
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// ONLY in server-side admin operations
const supabase = createSupabaseServiceClient();
const { data } = await supabase.from('teams').update({...});
```

**Use When:**
- Admin operations that bypass RLS
- Background jobs
- System-level operations

**⚠️ WARNING:**
- Never expose this client to the frontend
- Bypasses all security policies
- Use only when absolutely necessary

---

### 🌐 Client Components
```typescript
import { getBrowserClient } from '@/lib/supabase/client';

// In client component
const supabase = getBrowserClient();
const { data } = await supabase.from('teams').select('*');
```

**Use When:**
- Client Components (`'use client'`)
- Browser-side data fetching
- Real-time subscriptions

---

## 🚫 Deprecated Patterns

### ❌ Don't use direct imports from `/server`
```typescript
// ❌ OLD - Don't use
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ✅ NEW - Use instead
import { createSupabaseServer } from '@/lib/supabase/server-client';
```

---

## 📁 File Structure

```
src/lib/supabase/
├── server.ts              # Core server implementation
├── server-client.ts       # ✅ Recommended import (re-exports + helpers)
├── client.ts              # Browser client
└── README.md             # This file
```

---

## 🔒 Authentication Helper

```typescript
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';

export async function GET() {
  const supabase = createSupabaseServer();

  // Throws error if not authenticated
  const user = await requireAuth(supabase);

  // User is guaranteed to exist here
  const { data } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', user.id);

  return Response.json({ data });
}
```

---

## ✅ Migration Guide

If you have code using the old pattern:

```bash
# Find all files using old pattern
grep -r "createSupabaseServerClient" src/app/api

# Replace automatically (or manually)
# OLD: import { createSupabaseServerClient } from '@/lib/supabase/server';
# NEW: import { createSupabaseServer } from '@/lib/supabase/server-client';
```

---

## 🎯 Examples

### API Route (Standard)
```typescript
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';

export async function GET() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.from('teams').select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
```

### Server Component
```typescript
import { createSupabaseServer } from '@/lib/supabase/server-client';

export default async function TeamsPage() {
  const supabase = createSupabaseServer();
  const { data: teams } = await supabase.from('teams').select('*');

  return <div>{teams.map(t => <TeamCard key={t.id} team={t} />)}</div>;
}
```

### Client Component
```typescript
'use client';

import { getBrowserClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function TeamsList() {
  const [teams, setTeams] = useState([]);
  const supabase = getBrowserClient();

  useEffect(() => {
    supabase.from('teams').select('*').then(({ data }) => {
      setTeams(data);
    });
  }, []);

  return <div>{teams.map(t => <TeamCard key={t.id} team={t} />)}</div>;
}
```

---

## 📚 Additional Resources

- [Supabase Server-Side Auth](https://supabase.com/docs/guides/auth/server-side)
- [Next.js App Router with Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
