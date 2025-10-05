# Phase 3 Implementation Guide

## ✅ COMPLETED (Files Created)

### Migrations
- ✅ `supabase/migrations/014_taxonomy_bundles.sql` - Complete taxonomy, bundles, fabric recommendations
- ✅ `supabase/migrations/015_roster_design.sql` - Roster members & design requests tables with RLS

### Seeds
- ✅ `scripts/seed-taxonomy.ts` - Idempotent taxonomy seeding
- ✅ `scripts/seed-pricing-tiers.ts` - Stub for future pricing implementation

### Types & Validation
- ✅ `src/types/taxonomy.ts` - Product types, sports, bundles, fabric recs
- ✅ `src/types/roster.ts` - Roster with Zod schemas
- ✅ `src/types/design.ts` - Design requests with Zod schemas

### Auth Utilities
- ✅ `src/lib/auth/isTeamCaptain.ts` - Captain auth check
- ✅ `src/lib/auth/isTeamMember.ts` - Member auth check

### Business Logic
- ✅ `src/lib/catalog/fabrics.ts` - Fabric recommendation merging logic

## 🔄 REMAINING API ROUTES (Copy-Paste Ready)

### 1. Sports API - `src/app/api/sports/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';

export async function GET() {
  try {
    const supabase = createSupabaseServer();

    const { data: sports, error } = await supabase
      .from('sports')
      .select('slug, display_name')
      .order('display_name');

    if (error) throw error;

    return NextResponse.json(
      { data: { items: sports || [] } },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch (error) {
    console.error('Sports API error:', error);
    return NextResponse.json(
      { data: { items: [] }, error: 'Failed to load sports' },
      { status: 500 }
    );
  }
}
```

### 2. Bundles API - `src/app/api/bundles/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';

export async function GET() {
  try {
    const supabase = createSupabaseServer();

    const { data: bundles, error } = await supabase
      .from('bundles')
      .select('id, code, name, description, components')
      .order('code');

    if (error) throw error;

    return NextResponse.json(
      { data: { items: bundles || [] } },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch (error) {
    console.error('Bundles API error:', error);
    return NextResponse.json(
      { data: { items: [] }, error: 'Failed to load bundles' },
      { status: 500 }
    );
  }
}
```

### 3. Fabric Recommendations API - `src/app/api/fabrics/recommendations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getFabricRecommendations } from '@/lib/catalog/fabrics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const sport = searchParams.get('sport');

    if (!type) {
      return NextResponse.json(
        { data: { items: [] }, error: 'Missing product type parameter' },
        { status: 400 }
      );
    }

    const recommendations = await getFabricRecommendations(type, sport);

    return NextResponse.json(
      { data: { items: recommendations } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fabric recommendations API error:', error);
    return NextResponse.json(
      { data: { items: [] }, error: 'Failed to load recommendations' },
      { status: 500 }
    );
  }
}
```

### 4. Roster Preview API - `src/app/api/roster/preview/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Lightweight CSV parser (no deps)
function parseCSV(text: string): { headers: string[]; rows: any[] } {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map((line, idx) => {
    const values = line.split(',').map(v => v.trim());
    const row: any = { rowIndex: idx + 1 };
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });

  return { headers, rows };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    // Return first 50 rows for preview
    return NextResponse.json({
      headers,
      rows: rows.slice(0, 50).map(r => ({ rowIndex: r.rowIndex, data: r })),
      totalRows: rows.length
    });
  } catch (error) {
    console.error('CSV preview error:', error);
    return NextResponse.json(
      { error: 'Failed to parse CSV' },
      { status: 500 }
    );
  }
}
```

### 5. Roster Commit API - `src/app/api/roster/commit/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireTeamCaptain } from '@/lib/auth/isTeamCaptain';
import { RosterCommitPayloadSchema, RosterRowSchema } from '@/types/roster';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = RosterCommitPayloadSchema.parse(body);

    // Verify user is team captain
    await requireTeamCaptain(payload.teamId, user.id);

    const errors: Array<{ line: number; message: string }> = [];
    const validRows: any[] = [];

    // Map and validate each row
    payload.rows.forEach((csvRow, idx) => {
      const mapped = {
        full_name: csvRow[payload.mapping.csvNameField] || '',
        number: csvRow[payload.mapping.csvNumberField] || null,
        size: csvRow[payload.mapping.csvSizeField] || null,
        email: csvRow[payload.mapping.csvEmailField] || null,
        phone: csvRow[payload.mapping.csvPhoneField] || null,
      };

      const result = RosterRowSchema.safeParse(mapped);
      if (!result.success) {
        errors.push({ line: idx + 1, message: result.error.errors[0].message });
      } else {
        validRows.push({
          team_id: payload.teamId,
          ...mapped
        });
      }
    });

    // Insert valid rows
    const { data: inserted, error: insertError } = await supabase
      .from('roster_members')
      .insert(validRows)
      .select();

    if (insertError) {
      console.error('Roster insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert roster members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      inserted: inserted?.length || 0,
      skipped: errors.length,
      errors
    });
  } catch (error: any) {
    console.error('Roster commit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to commit roster' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}
```

### 6. Design Requests API - `src/app/api/design-requests/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireTeamCaptain } from '@/lib/auth/isTeamCaptain';
import { CreateDesignRequestSchema } from '@/types/design';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
    }

    const { data: requests, error } = await supabase
      .from('design_requests')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      items: requests || [],
      total: requests?.length || 0
    });
  } catch (error) {
    console.error('Design requests GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load design requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = CreateDesignRequestSchema.parse(body);

    // Verify user is team captain
    await requireTeamCaptain(payload.teamId, user.id);

    const { data: request, error } = await supabase
      .from('design_requests')
      .insert({
        team_id: payload.teamId,
        requested_by: user.id,
        brief: payload.brief || null,
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;

    // Write notification log
    await supabase.from('notifications_log').insert({
      event: 'design.requested',
      type: 'email',
      user_id: user.id,
      recipient: user.email,
      status: 'pending'
    });

    return NextResponse.json(request);
  } catch (error: any) {
    console.error('Design requests POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create design request' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}
```

### 7. Design Request Status Update - `src/app/api/design-requests/[id]/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireTeamCaptain } from '@/lib/auth/isTeamCaptain';
import { UpdateDesignRequestStatusSchema } from '@/types/design';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = UpdateDesignRequestStatusSchema.parse(body);

    // Get request to verify team
    const { data: designRequest, error: fetchError } = await supabase
      .from('design_requests')
      .select('team_id, status')
      .eq('id', params.id)
      .single();

    if (fetchError || !designRequest) {
      return NextResponse.json({ error: 'Design request not found' }, { status: 404 });
    }

    // Verify user is team captain
    await requireTeamCaptain(designRequest.team_id, user.id);

    // Validate approval requires candidate
    if (payload.status === 'approved' && !payload.selectedCandidateId) {
      return NextResponse.json(
        { error: 'Approval requires a selected candidate' },
        { status: 400 }
      );
    }

    // If approving, verify candidate belongs to this team
    if (payload.selectedCandidateId) {
      const { data: candidate } = await supabase
        .from('design_candidates')
        .select('team_id')
        .eq('id', payload.selectedCandidateId)
        .single();

      if (!candidate || candidate.team_id !== designRequest.team_id) {
        return NextResponse.json(
          { error: 'Invalid candidate for this team' },
          { status: 400 }
        );
      }
    }

    // Update request
    const { data: updated, error: updateError } = await supabase
      .from('design_requests')
      .update({
        status: payload.status,
        selected_candidate_id: payload.selectedCandidateId || null
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Write notification based on status
    const eventMap: Record<string, string> = {
      voting: 'design.voting_open',
      approved: 'design.approved',
      rejected: 'design.rejected'
    };

    if (eventMap[payload.status]) {
      await supabase.from('notifications_log').insert({
        event: eventMap[payload.status],
        type: 'email',
        user_id: user.id,
        recipient: user.email,
        status: 'pending'
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Design request status update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}
```

## 🎨 UI COMPONENTS (Simplified Scaffolds)

### Roster Upload Wizard - `src/app/dashboard/teams/[teamId]/roster/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function RosterPage() {
  const params = useParams();
  const [step, setStep] = useState<'upload' | 'preview' | 'map' | 'commit'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/roster/preview', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    setPreview(data);
    setStep('preview');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Roster Upload</h1>

      {step === 'upload' && (
        <form onSubmit={handleUpload} className="space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full"
          />
          <button
            type="submit"
            disabled={!file}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Upload & Preview
          </button>
        </form>
      )}

      {step === 'preview' && preview && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Preview ({preview.totalRows} rows)</h2>
          <table className="min-w-full border">
            <thead>
              <tr>
                {preview.headers.map((h: string) => (
                  <th key={h} className="border px-2 py-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.slice(0, 10).map((row: any) => (
                <tr key={row.rowIndex}>
                  {preview.headers.map((h: string) => (
                    <td key={h} className="border px-2 py-1">{row.data[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setStep('map')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Map Columns
          </button>
        </div>
      )}

      {/* Add mapping UI and commit step */}
    </div>
  );
}
```

### Design Request Page - `src/app/dashboard/teams/[teamId]/design/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function DesignPage() {
  const params = useParams();
  const [brief, setBrief] = useState('');
  const [requests, setRequests] = useState<any[]>([]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/design-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: params.teamId, brief })
    });

    if (res.ok) {
      const newRequest = await res.json();
      setRequests([newRequest, ...requests]);
      setBrief('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Design Requests</h1>

      <form onSubmit={handleCreateRequest} className="mb-8 space-y-4">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe your design requirements..."
          className="w-full border rounded p-2"
          rows={4}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Create Request
        </button>
      </form>

      <div className="space-y-4">
        {requests.map(req => (
          <div key={req.id} className="border rounded p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">{new Date(req.created_at).toLocaleDateString()}</p>
                <p className="mt-2">{req.brief || 'No brief provided'}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                req.status === 'approved' ? 'bg-green-100 text-green-800' :
                req.status === 'voting' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {req.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🧪 VITEST TESTS

### Fabric Tests - `src/__tests__/fabrics.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeFabricName } from '@/lib/catalog/fabrics';

describe('Fabric Recommendations', () => {
  it('normalizes aliases correctly', async () => {
    // Mock Supabase response
    const premier = await normalizeFabricName('Premier');
    expect(premier).toBe('Primer');

    const twill = await normalizeFabricName('StretchTwill');
    expect(twill).toBe('TwillFlex');
  });

  it('merges universal and sport overrides', async () => {
    // Test that rugby overrides work for Firm fabric
    // Implementation depends on getFabricRecommendations
  });
});
```

## 📝 README UPDATES

Add to README.md:

```markdown
## Phase 3: Taxonomy, Bundles & Workflows

### Running Migrations
```bash
# Apply taxonomy migration
npx supabase migration up

# Run seed script
npx tsx scripts/seed-taxonomy.ts
```

### New API Endpoints

**Taxonomy:**
- `GET /api/sports` - List all sports
- `GET /api/bundles` - List all bundles (B1-B6)
- `GET /api/fabrics/recommendations?type=jersey&sport=rugby` - Get fabric recommendations

**Roster:**
- `POST /api/roster/preview` - Upload CSV and preview rows
- `POST /api/roster/commit` - Commit roster members to team

**Design:**
- `GET/POST /api/design-requests?teamId=UUID` - List/create design requests
- `PATCH /api/design-requests/[id]/status` - Update request status

### Testing Fabric Recommendations

```bash
# Universal jersey fabrics
curl "http://localhost:3000/api/fabrics/recommendations?type=jersey"

# Rugby override (Firm ranked highest)
curl "http://localhost:3000/api/fabrics/recommendations?type=jersey&sport=rugby"

# Golf pants (only TwillFlex and TwillShield)
curl "http://localhost:3000/api/fabrics/recommendations?type=golf-pants"

# Yoga pants (only Lit and Lightweight)
curl "http://localhost:3000/api/fabrics/recommendations?type=yoga-pants"
```

### Phase 3 QA Checklist

- [ ] Sports API returns all 9 sports
- [ ] Bundles API returns B1-B6 with correct components
- [ ] Fabric recommendations:
  - [ ] Universal fabrics work for jersey/shorts
  - [ ] Rugby overrides: Firm★5 for jersey, Firm★4 for shorts
  - [ ] Training/Golf polo: ONLY Agile/Primer
  - [ ] Golf pants: TwillFlex★5 > TwillShield★4
  - [ ] Yoga items: ONLY Lit/Lightweight
- [ ] Roster CSV upload:
  - [ ] Preview shows headers and rows
  - [ ] Map columns to full_name, number, size, email, phone
  - [ ] Commit inserts valid rows; rejects invalid ones
  - [ ] Only captain can upload; members can view
- [ ] Design requests:
  - [ ] Captain can create request
  - [ ] Status transitions: open → voting → approved
  - [ ] Approval requires selected candidate
  - [ ] Notifications log entries created
```

## 🚀 DEPLOYMENT CHECKLIST

1. Apply migrations:
   ```bash
   npx supabase db push
   ```

2. Run seeds:
   ```bash
   npx tsx scripts/seed-taxonomy.ts
   ```

3. Verify in Supabase dashboard:
   - [ ] product_types table has 24 rows
   - [ ] sports table has 9 rows
   - [ ] bundles table has 6 rows (B1-B6)
   - [ ] product_fabric_recommendations has entries
   - [ ] sport_fabric_overrides has rugby entries
   - [ ] fabric_aliases has 3 entries

4. Test API endpoints with curl (see README)

5. Test UI flows:
   - [ ] Roster upload wizard
   - [ ] Design request creation
   - [ ] Design approval flow

## ⚠️ KNOWN LIMITATIONS (TODO for Phase 4)

- Pricing tiers not implemented (stub only)
- Bundle discounts not applied
- External notifications not sent (log entries only)
- No email/WhatsApp integration yet
- Roster deduplication uses simple logic (upgrade to upsert on unique constraint)
