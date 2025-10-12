import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Dev-only endpoint to inspect database schema
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get columns for key tables by querying actual data
    const keyTables = ['teams', 'team_memberships', 'player_info_submissions', 'profiles', 'team_settings'];
    const schemaInfo: Record<string, any> = {};

    for (const tableName of keyTables) {
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!sampleError && sample) {
        schemaInfo[tableName] = {
          exists: true,
          columns: sample[0] ? Object.keys(sample[0]).sort() : [],
          sampleData: sample[0] || null
        };
      } else {
        schemaInfo[tableName] = {
          exists: false,
          error: sampleError?.message || 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      schemaInfo,
      note: 'Schema information based on actual table queries',
      instructions: 'Check the columns array for each table to see what fields exist'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
