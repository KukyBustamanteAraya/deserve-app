// Roster CSV preview API - parses CSV and returns preview
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Simple CSV parser (no external dependencies)
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => 
    line.split(',').map(cell => cell.trim())
  );

  return { headers, rows };
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const teamId = formData.get('teamId') as string;

    if (!file || !teamId) {
      return NextResponse.json(
        { error: 'File and teamId are required' },
        { status: 400 }
      );
    }

    // Verify user is team captain
    const { data: team } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single();

    if (!team || team.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only team captain can upload roster' },
        { status: 403 }
      );
    }

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    return NextResponse.json({
      data: {
        headers,
        rows: rows.slice(0, 10), // Preview first 10 rows
        totalRows: rows.length
      }
    });
  } catch (error) {
    console.error('CSV parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse CSV file' },
      { status: 500 }
    );
  }
}
