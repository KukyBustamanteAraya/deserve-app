import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { logger } from '@/lib/logger';
import { toError } from '@/lib/error-utils';

const SETTINGS_DIR = join(process.cwd(), 'data');
const SETTINGS_FILE = join(SETTINGS_DIR, 'theme-settings.json');
const STATIC_ICONS_DIR = join(process.cwd(), 'public');

interface ThemeSettings {
  logo?: {
    mode: 'text' | 'logo';
    primaryLogoUrl: string | null;
    secondaryLogoUrl: string | null;
  };
}

async function getSettings(): Promise<ThemeSettings> {
  try {
    if (!existsSync(SETTINGS_FILE)) {
      return {};
    }
    const data = await readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error reading theme settings:', toError(error));
    return {};
  }
}

async function getFallbackIcon(size: number): Promise<Buffer | null> {
  try {
    const iconPath = join(STATIC_ICONS_DIR, `icon-${size}x${size}.png`);
    if (existsSync(iconPath)) {
      return await readFile(iconPath);
    }
    return null;
  } catch (error) {
    logger.error(`Error reading fallback icon for size ${size}:`, toError(error));
    return null;
  }
}

async function generateIconFromLogo(logoPath: string, size: number): Promise<Buffer> {
  const fullLogoPath = join(process.cwd(), 'public', logoPath);

  if (!existsSync(fullLogoPath)) {
    throw new Error(`Logo file not found: ${logoPath}`);
  }

  // Read the logo
  const logoBuffer = await readFile(fullLogoPath);

  // Get logo metadata to maintain aspect ratio
  const logoMetadata = await sharp(logoBuffer).metadata();
  const logoWidth = logoMetadata.width || size;
  const logoHeight = logoMetadata.height || size;

  // Calculate scaled dimensions (70% of icon size, maintaining aspect ratio)
  const maxLogoSize = Math.floor(size * 0.7);
  const scale = Math.min(maxLogoSize / logoWidth, maxLogoSize / logoHeight);
  const scaledWidth = Math.floor(logoWidth * scale);
  const scaledHeight = Math.floor(logoHeight * scale);

  // Resize logo
  const resizedLogo = await sharp(logoBuffer)
    .resize(scaledWidth, scaledHeight, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Create dark background with centered logo
  const icon = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 24, g: 24, b: 24, alpha: 1 }, // #181818
    },
  })
    .composite([
      {
        input: resizedLogo,
        top: Math.floor((size - scaledHeight) / 2),
        left: Math.floor((size - scaledWidth) / 2),
      },
    ])
    .png()
    .toBuffer();

  return icon;
}

type Params = Promise<{
  size: string;
}>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { size: sizeParam } = await params;
    const size = parseInt(sizeParam);

    // Validate size
    const validSizes = [192, 256, 384, 512];
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { error: 'Invalid icon size. Must be 192, 256, 384, or 512' },
        { status: 400 }
      );
    }

    // Get theme settings
    const settings = await getSettings();
    const logoSettings = settings.logo;

    // Check if we should use dynamic logo
    const shouldUseDynamicLogo =
      logoSettings?.mode === 'logo' &&
      logoSettings?.primaryLogoUrl;

    let iconBuffer: Buffer | null = null;

    if (shouldUseDynamicLogo && logoSettings?.primaryLogoUrl) {
      try {
        logger.info(`Generating dynamic PWA icon (${size}x${size}) from theme logo`);
        iconBuffer = await generateIconFromLogo(logoSettings.primaryLogoUrl, size);
      } catch (error) {
        logger.error(`Failed to generate dynamic icon, falling back to static:`, toError(error));
        iconBuffer = await getFallbackIcon(size);
      }
    } else {
      // Use static fallback icon
      logger.debug(`Using static fallback icon for size ${size}`);
      iconBuffer = await getFallbackIcon(size);
    }

    if (!iconBuffer) {
      return NextResponse.json(
        { error: 'Icon not found' },
        { status: 404 }
      );
    }

    // Return PNG with proper caching headers
    // Convert Buffer to Uint8Array for Response constructor
    return new Response(new Uint8Array(iconBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    logger.error('Error generating PWA icon:', toError(error));
    return NextResponse.json(
      { error: 'Failed to generate icon' },
      { status: 500 }
    );
  }
}
