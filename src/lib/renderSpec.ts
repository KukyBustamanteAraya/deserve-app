/**
 * Render Spec Builder for OpenAI Image Recoloring
 * Generates JSON specifications for automated mockup generation
 */

export type Colorway = {
  primary: string;
  secondary: string;
  tertiary?: string;
  accents?: Record<string, string | null>;
};

export type RenderSpec = {
  version: '1.0';
  design: string;
  view: 'front_flat' | 'back_flat' | '3d_model';
  source_image: string;
  presentation: {
    background: 'transparent' | 'white' | 'studio';
    framing: 'centered_flatlay' | 'mannequin' | 'lifestyle';
    keep_design_intact: true;
    preserve_texture: true;
    preserve_shadows: true;
  };
  colorway: Colorway;
  rules: {
    only_change_colors: true;
    preserve_logo: true;
    preserve_seams?: boolean;
    preserve_collar?: boolean;
  };
  masks?: { [layerId: string]: string }; // Optional URLs to PNG masks (RGBA)
  export: {
    format: 'png' | 'jpg';
    background: 'transparent' | 'white';
    dpi: number;
  };
};

export interface CreateRenderSpecOptions {
  design: string;
  imageUrl: string;
  colors: Colorway;
  masks?: Record<string, string>;
  view?: 'front_flat' | 'back_flat' | '3d_model';
}

/**
 * Creates a render specification for OpenAI image editing
 */
export function createRenderSpec(options: CreateRenderSpecOptions): RenderSpec {
  const { design, imageUrl, colors, masks, view = 'front_flat' } = options;

  return {
    version: '1.0',
    design,
    view,
    source_image: imageUrl,
    presentation: {
      background: 'transparent',
      framing: 'centered_flatlay',
      keep_design_intact: true,
      preserve_texture: true,
      preserve_shadows: true,
    },
    colorway: colors,
    rules: {
      only_change_colors: true,
      preserve_logo: true,
      preserve_seams: true,
      preserve_collar: true,
    },
    masks,
    export: {
      format: 'png',
      background: 'transparent',
      dpi: 144,
    },
  };
}

/**
 * Generates OpenAI prompt for color recoloring with masks
 */
export function generateRecolorPrompt(options: {
  color: string;
  layerName: string;
  preserveLogo?: boolean;
}): string {
  const { color, layerName, preserveLogo = true } = options;

  const basePrompt = `Recolor ONLY the white pixels of the mask to HEX color ${color}.`;
  const preservationRules = [
    'Keep composition, design lines, fabric weave, wrinkles, seams, highlights, and shadows identical.',
    'Maintain the same background.',
    preserveLogo ? 'Do not alter the logo or any text.' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return `${basePrompt} ${preservationRules} Layer: ${layerName}`;
}

/**
 * Generates maskless recolor prompt (fallback when masks unavailable)
 */
export function generateMasklessPrompt(color: string, area: string): string {
  return `Change the ${area} fabric color areas to HEX color ${color} while preserving design lines, trims, collar, cuffs, and logo. Do not recolor these preserved elements. Keep all fabric texture, wrinkles, seams, highlights, and shadows identical.`;
}
