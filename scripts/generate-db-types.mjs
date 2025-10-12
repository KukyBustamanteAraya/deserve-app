#!/usr/bin/env node
// Generate TypeScript types from Supabase database schema
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
} catch (err) {
  console.log('Could not load .env.local, using process.env');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_KEY);
  console.log('\nFalling back to manual type generation...');
  generateTypesFromMigrations();
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Map PostgreSQL types to TypeScript types
const pgToTsType = (pgType, isNullable) => {
  const nullable = isNullable === 'YES' ? ' | null' : '';

  const typeMap = {
    'uuid': 'string',
    'text': 'string',
    'character varying': 'string',
    'varchar': 'string',
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'boolean': 'boolean',
    'timestamp with time zone': 'string',
    'timestamp without time zone': 'string',
    'date': 'string',
    'json': 'Json',
    'jsonb': 'Json',
    'ARRAY': 'string[]',
    'USER-DEFINED': 'string' // For enums and custom types
  };

  return (typeMap[pgType] || 'unknown') + nullable;
};

async function generateTypes() {
  console.log('🔍 Introspecting database schema...');

  // Query for all tables in the public schema
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (tablesError) {
    // Fallback: Use direct query
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .order('table_name')
      .order('ordinal_position');

    if (!columns || columns.length === 0) {
      console.error('❌ Could not fetch schema information');
      console.log('Falling back to manual type generation from migrations...');
      generateTypesFromMigrations();
      return;
    }

    generateFromColumns(columns);
    return;
  }
}

function generateFromColumns(columns) {
  console.log('📝 Generating types from columns...');

  // Group columns by table
  const tableMap = {};
  columns.forEach(col => {
    if (!tableMap[col.table_name]) {
      tableMap[col.table_name] = [];
    }
    tableMap[col.table_name].push(col);
  });

  let output = `// Auto-generated database types
// Generated: ${new Date().toISOString()}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
`;

  // Generate type for each table
  Object.keys(tableMap).sort().forEach(tableName => {
    const cols = tableMap[tableName];
    output += `      ${tableName}: {\n`;
    output += `        Row: {\n`;

    cols.forEach(col => {
      const tsType = pgToTsType(col.data_type, col.is_nullable);
      output += `          ${col.column_name}: ${tsType}\n`;
    });

    output += `        }\n`;
    output += `        Insert: {\n`;

    cols.forEach(col => {
      const isOptional = col.column_default !== null || col.is_nullable === 'YES';
      const tsType = pgToTsType(col.data_type, col.is_nullable);
      output += `          ${col.column_name}${isOptional ? '?' : ''}: ${tsType}\n`;
    });

    output += `        }\n`;
    output += `        Update: {\n`;

    cols.forEach(col => {
      const tsType = pgToTsType(col.data_type, col.is_nullable);
      output += `          ${col.column_name}?: ${tsType}\n`;
    });

    output += `        }\n`;
    output += `      }\n`;
  });

  output += `    }\n`;
  output += `    Views: {}\n`;
  output += `    Functions: {}\n`;
  output += `    Enums: {}\n`;
  output += `  }\n`;
  output += `}\n`;

  const outputPath = 'src/types/database.types.ts';
  writeFileSync(outputPath, output);
  console.log(`✅ Types generated successfully: ${outputPath}`);
  console.log(`📊 Generated types for ${Object.keys(tableMap).length} tables`);
}

function generateTypesFromMigrations() {
  console.log('📝 Generating basic types structure...');

  // Create a basic, comprehensive types file based on known schema
  const output = `// Auto-generated database types
// Generated: ${new Date().toISOString()}
// Note: This is a basic structure. Run 'npm run generate:types' with proper DB access for full types.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          role: 'customer' | 'admin'
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'customer' | 'admin'
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'customer' | 'admin'
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          sport_id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          team_type: 'small' | 'large' | 'institution' | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sport_id: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          team_type?: 'small' | 'large' | 'institution' | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sport_id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          team_type?: 'small' | 'large' | 'institution' | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      sports: {
        Row: {
          id: string
          slug: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          sport_id: string
          category: string
          name: string
          slug: string
          description: string | null
          price_cents: number
          base_price_cents: number | null
          retail_price_cents: number | null
          product_type_slug: string | null
          hero_path: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sport_id: string
          category: string
          name: string
          slug: string
          description?: string | null
          price_cents: number
          base_price_cents?: number | null
          retail_price_cents?: number | null
          product_type_slug?: string | null
          hero_path?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sport_id?: string
          category?: string
          name?: string
          slug?: string
          description?: string | null
          price_cents?: number
          base_price_cents?: number | null
          retail_price_cents?: number | null
          product_type_slug?: string | null
          hero_path?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      design_requests: {
        Row: {
          id: string
          team_id: string
          requested_by: string
          status: string
          brief: string | null
          mockup_urls: string[] | null
          feedback: string | null
          order_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          requested_by: string
          status?: string
          brief?: string | null
          mockup_urls?: string[] | null
          feedback?: string | null
          order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          requested_by?: string
          status?: string
          brief?: string | null
          mockup_urls?: string[] | null
          feedback?: string | null
          order_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          status: string
          currency: string
          subtotal_cents: number
          total_cents: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          status?: string
          currency?: string
          subtotal_cents: number
          total_cents: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          status?: string
          currency?: string
          subtotal_cents?: number
          total_cents?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      teams_with_details: {
        Row: {
          id: string
          name: string
          slug: string
          sport_id: string
          sport_name: string
          sport_slug: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          team_type: string | null
          created_by: string
          member_count: number
          created_at: string
          updated_at: string
        }
      }
    }
    Functions: {}
    Enums: {
      user_role: 'customer' | 'admin'
      order_status: 'draft' | 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
      design_status: 'open' | 'in_review' | 'approved' | 'rejected' | 'complete'
    }
  }
}

// Helper types for working with the database
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']
`;

  const outputPath = 'src/types/database.types.ts';
  writeFileSync(outputPath, output);
  console.log(`✅ Basic types generated: ${outputPath}`);
  console.log('⚠️  Note: For complete types, ensure database connection is available');
}

// Run the generator
generateTypes().catch(err => {
  console.error('Error generating types:', err);
  console.log('Falling back to manual generation...');
  generateTypesFromMigrations();
});
