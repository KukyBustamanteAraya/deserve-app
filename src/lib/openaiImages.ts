/**
 * OpenAI Images API Wrapper
 * Supports gpt-image-1 with multi-variant generation
 */

import OpenAI from 'openai';
import sharp from 'sharp';

// Only throw error at runtime when actually using the API, not during build
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

let openai: OpenAI | null = null;
const getClient = () => {
  if (!openai) {
    openai = getOpenAIClient();
  }
  return openai;
};

export interface EditImageOptions {
  base: Buffer;
  mask?: Buffer;
  prompt: string;
  size?: '1024x1024' | '1536x1536' | '2048x2048';
  n?: number; // Number of variants to generate
  retries?: number;
}

/**
 * Convert image to RGBA format (required by OpenAI DALL-E 2)
 */
async function ensureRGBA(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .ensureAlpha() // Add alpha channel if missing
    .png() // Convert to PNG format
    .toBuffer();
}

/**
 * Edit an image using OpenAI's image edit API (gpt-image-1 only)
 * Returns single variant with exponential backoff retry logic
 */
export async function editOnce(options: EditImageOptions): Promise<Buffer> {
  const { base, mask, prompt, size = '1024x1024', retries = 3 } = options;

  const variants = await editMultiVariant({ ...options, n: 1, retries });
  return variants[0];
}

/**
 * Edit an image and generate multiple variants using gpt-image-1
 * Returns array of buffers (one per variant)
 */
export async function editMultiVariant(options: EditImageOptions): Promise<Buffer[]> {
  const { base, mask, prompt, size = '1024x1024', n = 2, retries = 3 } = options;

  console.log(`[OpenAI] Generating ${n} variant(s) with gpt-image-1...`);
  console.log(`[OpenAI] Prompt: ${prompt.substring(0, 150)}...`);
  console.log(`[OpenAI] Size: ${size}`);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`[OpenAI] Attempt ${attempt + 1}/${retries}`);

      // Convert images to RGBA format (required by OpenAI)
      const rgbaBase = await ensureRGBA(base);
      const rgbaMask = mask ? await ensureRGBA(mask) : undefined;

      // Convert buffers to File objects for OpenAI API
      const imageFile = new File([rgbaBase], 'image.png', { type: 'image/png' });
      const maskFile = rgbaMask ? new File([rgbaMask], 'mask.png', { type: 'image/png' }) : undefined;

      // Use dall-e-2 for image editing (returns URLs, not base64)
      console.log('[OpenAI] Using dall-e-2 model (URL mode)');
      const response = await getClient().images.edit({
        model: 'dall-e-2',
        image: imageFile,
        mask: maskFile,
        prompt,
        size,
        n: n || 1,
        // Note: dall-e-2 doesn't support response_format, always returns URLs
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No image data returned from OpenAI');
      }

      // Download all variants (handle both b64_json and url formats)
      const variants: Buffer[] = [];
      for (let i = 0; i < response.data.length; i++) {
        const item = response.data[i];

        if (item.b64_json) {
          // Base64 format
          const buffer = Buffer.from(item.b64_json, 'base64');
          console.log(`[OpenAI] Variant ${i + 1}: ${buffer.length} bytes (b64)`);
          variants.push(buffer);
        } else if (item.url) {
          // URL format - download
          console.log(`[OpenAI] Variant ${i + 1}: Downloading from URL...`);
          const imageResponse = await fetch(item.url);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download variant ${i}: ${imageResponse.statusText}`);
          }
          const arrayBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log(`[OpenAI] Variant ${i + 1}: ${buffer.length} bytes (url)`);
          variants.push(buffer);
        } else {
          throw new Error(`Variant ${i} has neither b64_json nor url`);
        }
      }

      console.log(`[OpenAI] Success! Generated ${variants.length} variant(s)`);
      return variants;
    } catch (error: any) {
      lastError = error;
      const isRateLimitError = error?.status === 429;
      const isServerError = error?.status >= 500;

      // Exponential backoff: 1s, 2s, 4s
      const waitTime = Math.pow(2, attempt) * 1000;

      if ((isRateLimitError || isServerError) && attempt < retries - 1) {
        console.warn(`[OpenAI] Error ${error?.status}, retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Don't retry on client errors (except rate limit)
      if (error?.status >= 400 && error?.status < 500 && !isRateLimitError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
  }

  throw lastError || new Error('Failed to edit image after retries');
}
