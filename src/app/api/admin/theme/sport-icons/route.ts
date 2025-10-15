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
  sportIcons?: {
    futbolIconUrl: string | null;
    basquetbolIconUrl: string | null;
    voleibolIconUrl: string | null;
    rugbyIconUrl: string | null;
    hockeyIconUrl: string | null;
    tenisIconUrl: string | null;
    handballIconUrl: string | null;
    beisbolIconUrl: string | null;
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
    const {
      futbolIconUrl,
      basquetbolIconUrl,
      voleibolIconUrl,
      rugbyIconUrl,
      hockeyIconUrl,
      tenisIconUrl,
      handballIconUrl,
      beisbolIconUrl,
    } = body;

    // Get current settings
    const settings = await getSettings();

    // Update sport icon settings
    settings.sportIcons = {
      futbolIconUrl,
      basquetbolIconUrl,
      voleibolIconUrl,
      rugbyIconUrl,
      hockeyIconUrl,
      tenisIconUrl,
      handballIconUrl,
      beisbolIconUrl,
    };

    // Save settings
    await saveSettings(settings);

    logger.info('Sport icon settings saved successfully');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error saving sport icon settings:', error);
    return NextResponse.json(
      { error: 'Failed to save sport icon settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings.sportIcons || {}, { status: 200 });
  } catch (error) {
    logger.error('Error getting sport icon settings:', error);
    return NextResponse.json(
      { error: 'Failed to get sport icon settings' },
      { status: 500 }
    );
  }
}
