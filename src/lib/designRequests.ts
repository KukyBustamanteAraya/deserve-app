/**
 * Design Requests Database Helper
 * Handle database operations for design_requests table
 */

export interface RenderSpec {
  mode: 'template' | 'ai';
  colors: {
    primary: string;
    secondary?: string;
    tertiary?: string;
  };
  templateUrl: string;
  masks?: {
    body?: string;
    sleeves?: string;
    trims?: string;
  };
  timestamp: string;
}

export interface SaveRenderResultParams {
  designRequestId: string;
  renderSpec: RenderSpec;
  outputUrl: string;
  supabase: any;
}

/**
 * Save render result to database
 * Updates design_requests table with render_spec and output_url
 * Appends new output to mockup_urls array
 */
export async function saveRenderResult(params: SaveRenderResultParams): Promise<void> {
  const { designRequestId, renderSpec, outputUrl, supabase } = params;

  console.log(`[DB] Saving render result for design request ${designRequestId}`);

  // Get current mockup_urls array
  const { data: currentRequest, error: fetchError } = await supabase
    .from('design_requests')
    .select('mockup_urls')
    .eq('id', designRequestId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch current design request: ${fetchError.message}`);
  }

  const currentMockups = currentRequest?.mockup_urls || [];
  const updatedMockups = [...currentMockups, outputUrl];

  // Update design request with results
  const { error: updateError } = await supabase
    .from('design_requests')
    .update({
      status: 'ready',
      output_url: outputUrl,
      mockup_urls: updatedMockups,
      render_spec: renderSpec,
      updated_at: new Date().toISOString(),
    })
    .eq('id', designRequestId);

  if (updateError) {
    throw new Error(`Failed to update design request: ${updateError.message}`);
  }

  console.log(`[DB] Successfully saved render result`);
}
