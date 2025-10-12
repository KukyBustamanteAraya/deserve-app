import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from '@/lib/security/rateLimit';
import { assertSameSiteOrAllowed } from '@/lib/security/origin';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const check = assertSameSiteOrAllowed(request);
  if (!check.ok) return check.response;

  const { ok, resetInMs } = rateLimit(request, 'team:new');
  if (!ok) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(resetInMs / 1000)) },
    });
  }

  try {
    // Verify user session
    const supabase = createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    // TODO: When DB is set up, create team in database
    // const { data: team, error } = await supabase
    //   .from('teams')
    //   .insert({ name, created_by: user.id })
    //   .select()
    //   .single();

    // if (error) {
    //   return NextResponse.json({ error: error.message }, { status: 500 });
    // }

    // For now, just return success
    return NextResponse.json({ 
      ok: true, 
      message: "Team creation endpoint ready - DB integration pending",
      // team: team // Will be available when DB is set up
    });

  } catch (error) {
    logger.error("Error creating team:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}
