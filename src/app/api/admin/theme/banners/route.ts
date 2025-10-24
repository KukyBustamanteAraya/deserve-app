import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

const SETTINGS_DIR = join(process.cwd(), 'data');
const SETTINGS_FILE = join(SETTINGS_DIR, 'theme-settings.json');

interface ThemeSettings {
  logo?: {
    mode: 'text' | 'logo';
    primaryLogoUrl: string | null;
    secondaryLogoUrl: string | null;
  };
  banners?: {
    banner1Url: string | null;
    banner2Url: string | null;
    banner3Url: string | null;
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
    logger.error('Error reading settings:', toError(error));
    return {};
  }
}

async function saveSettings(settings: ThemeSettings) {
  try {
    if (!existsSync(SETTINGS_DIR)) {
      await mkdir(SETTINGS_DIR, { recursive: true });
    }
    await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    logger.error('Error saving settings:', toError(error));
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { banner1Url, banner2Url, banner3Url } = body;

    // Get current settings
    const settings = await getSettings();

    // Update banner settings
    settings.banners = {
      banner1Url,
      banner2Url,
      banner3Url,
    };

    // Save settings
    await saveSettings(settings);

    logger.info('Banner settings saved successfully');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error saving banner settings:', toError(error));
    return NextResponse.json(
      { error: 'Failed to save banner settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const settings = await getSettings();
    const response = NextResponse.json(settings.banners || {}, { status: 200 });
    // Add cache headers to speed up repeated requests
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error) {
    logger.error('Error getting banner settings:', toError(error));
    return NextResponse.json(
      { error: 'Failed to get banner settings' },
      { status: 500 }
    );
  }
}
