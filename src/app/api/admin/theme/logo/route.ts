import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';

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
    logger.error('Error reading settings:', error);
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
    logger.error('Error saving settings:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logoMode, primaryLogoUrl, secondaryLogoUrl } = body;

    // Get current settings
    const settings = await getSettings();

    // Update logo settings
    settings.logo = {
      mode: logoMode,
      primaryLogoUrl,
      secondaryLogoUrl,
    };

    // Save settings
    await saveSettings(settings);

    logger.info('Logo settings saved successfully');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error saving logo settings:', error);
    return NextResponse.json(
      { error: 'Failed to save logo settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings.logo || {}, { status: 200 });
  } catch (error) {
    logger.error('Error getting logo settings:', error);
    return NextResponse.json(
      { error: 'Failed to get logo settings' },
      { status: 500 }
    );
  }
}
