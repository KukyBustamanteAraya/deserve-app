// Design request status update API
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UpdateDesignRequestStatusSchema } from '@/types/design';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validated = UpdateDesignRequestStatusSchema.parse(body);

    // Get the design request and verify ownership
    const { data: designRequest } = await supabase
      .from('design_requests')
      .select('team_id, teams!inner(created_by)')
      .eq('id', params.id)
      .single();

    if (!designRequest || (designRequest.teams as any).created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only team captain can update design request status' },
        { status: 403 }
      );
    }

    const updateData: any = { status: validated.status };
    if (validated.selectedCandidateId) {
      updateData.selected_candidate_id = validated.selectedCandidateId;
    }

    const { data: updated, error } = await supabase
      .from('design_requests')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating design request:', error);
      return NextResponse.json(
        { error: 'Failed to update design request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}
