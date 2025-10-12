/**
 * Script to standardize Supabase client imports
 *
 * Replaces:
 *   import { createSupabaseServerClient } from '@/lib/supabase/server';
 * With:
 *   import { createSupabaseServer } from '@/lib/supabase/server-client';
 *
 * Also updates function calls from createSupabaseServerClient() to createSupabaseServer()
 *
 * Usage: node scripts/standardize-supabase-imports.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 Finding files with old Supabase import pattern...\n');

// Helper to find files recursively
function findFiles(dir, results = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        findFiles(filePath, results);
      }
    } else if (
      (file.endsWith('.ts') || file.endsWith('.tsx')) &&
      !file.includes('.test.') &&
      file !== 'server.ts' // Don't modify the source file
    ) {
      results.push(filePath);
    }
  }

  return results;
}

const files = findFiles(join(rootDir, 'src'));

let totalFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  let modified = false;
  let fileReplacements = 0;

  // Check if file uses old pattern
  const hasOldImport = content.includes("from '@/lib/supabase/server'") &&
                        content.includes('createSupabaseServerClient');

  if (hasOldImport) {
    // Replace import statement
    const oldImportPattern = /import\s*{\s*createSupabaseServerClient\s*}\s*from\s*['"]@\/lib\/supabase\/server['"]/g;
    const newImport = "import { createSupabaseServer } from '@/lib/supabase/server-client'";

    if (oldImportPattern.test(content)) {
      content = content.replace(oldImportPattern, newImport);
      modified = true;
      fileReplacements++;
    }

    // Also handle multi-line imports and imports with other exports
    const multiLinePattern = /import\s*{\s*createSupabaseServerClient([^}]*?)}\s*from\s*['"]@\/lib\/supabase\/server['"]/g;
    content = content.replace(multiLinePattern, (match, otherImports) => {
      modified = true;
      fileReplacements++;
      // If there are other imports, keep them but replace createSupabaseServerClient
      return match.replace('createSupabaseServerClient', 'createSupabaseServer')
                  .replace("from '@/lib/supabase/server'", "from '@/lib/supabase/server-client'");
    });

    // Replace function calls
    const callPattern = /createSupabaseServerClient\s*\(/g;
    const callMatches = content.match(callPattern);
    if (callMatches) {
      content = content.replace(callPattern, 'createSupabaseServer(');
      fileReplacements += callMatches.length;
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(file, content, 'utf8');

    const relativePath = file.replace(rootDir + '/', '');
    console.log(`✅ ${relativePath}`);
    console.log(`   - Replacements: ${fileReplacements}\n`);

    totalFiles++;
    totalReplacements += fileReplacements;
  }
}

console.log('\n📊 Summary:');
console.log(`   Files modified: ${totalFiles}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log('');

if (totalFiles > 0) {
  console.log('✅ Done! Standardization complete.');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Review changes: git diff');
  console.log('   2. Test the app: npm run dev');
  console.log('   3. Check TypeScript: npm run typecheck');
  console.log('');
  console.log('📚 See: src/lib/supabase/README.md for usage guidelines');
} else {
  console.log('✨ All imports already use the standard pattern!');
}
