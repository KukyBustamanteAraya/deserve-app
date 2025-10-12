/**
 * Script to replace console.log statements with logger utility
 *
 * This script:
 * 1. Finds all .ts and .tsx files in src/
 * 2. Replaces console.log with logger.debug
 * 3. Replaces console.error with logger.error
 * 4. Replaces console.warn with logger.warn
 * 5. Adds the logger import if not present
 *
 * Usage: node scripts/replace-console-logs.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 Finding files with console statements...\n');

// Helper function to recursively find files
function findFiles(dir, pattern, results = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and test directories
      if (!file.includes('node_modules') && !file.includes('.next')) {
        findFiles(filePath, pattern, results);
      }
    } else if (
      (file.endsWith('.ts') || file.endsWith('.tsx')) &&
      !file.includes('.test.') &&
      !file.includes('.spec.') &&
      file !== 'logger.ts'
    ) {
      results.push(filePath);
    }
  }

  return results;
}

// Find all TypeScript files except test files and node_modules
const files = findFiles(join(rootDir, 'src'));

let totalFiles = 0;
let totalReplacements = 0;
const stats = {
  'console.log': 0,
  'console.error': 0,
  'console.warn': 0,
  'console.debug': 0,
};

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  let modified = false;
  let fileReplacements = 0;

  // Track what we replaced
  const fileStats = { ...stats };

  // Replace console.log
  const logMatches = content.match(/console\.log\(/g);
  if (logMatches) {
    fileStats['console.log'] = logMatches.length;
    content = content.replace(/console\.log\(/g, 'logger.debug(');
    modified = true;
    fileReplacements += logMatches.length;
  }

  // Replace console.error
  const errorMatches = content.match(/console\.error\(/g);
  if (errorMatches) {
    fileStats['console.error'] = errorMatches.length;
    content = content.replace(/console\.error\(/g, 'logger.error(');
    modified = true;
    fileReplacements += errorMatches.length;
  }

  // Replace console.warn
  const warnMatches = content.match(/console\.warn\(/g);
  if (warnMatches) {
    fileStats['console.warn'] = warnMatches.length;
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
    fileReplacements += warnMatches.length;
  }

  // Replace console.debug
  const debugMatches = content.match(/console\.debug\(/g);
  if (debugMatches) {
    fileStats['console.debug'] = debugMatches.length;
    content = content.replace(/console\.debug\(/g, 'logger.debug(');
    modified = true;
    fileReplacements += debugMatches.length;
  }

  // Add import if we made changes and import doesn't exist
  if (modified) {
    // Check if logger import already exists
    if (!content.includes("from '@/lib/logger'") && !content.includes('from "@/lib/logger"')) {
      // Find the last import statement
      const importRegex = /^import .* from .*;$/gm;
      const imports = content.match(importRegex);

      if (imports && imports.length > 0) {
        // Add after the last import
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;

        content =
          content.slice(0, insertPosition) +
          "\nimport { logger } from '@/lib/logger';" +
          content.slice(insertPosition);
      } else {
        // No imports, add at the top (after 'use client' if present)
        if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
          const firstNewline = content.indexOf('\n');
          content =
            content.slice(0, firstNewline + 1) +
            "\nimport { logger } from '@/lib/logger';\n" +
            content.slice(firstNewline + 1);
        } else {
          content = "import { logger } from '@/lib/logger';\n" + content;
        }
      }
    }

    writeFileSync(file, content, 'utf8');

    // Show file stats
    const relativePath = file.replace(rootDir + '/', '');
    console.log(`✅ ${relativePath}`);
    if (fileStats['console.log']) console.log(`   - console.log: ${fileStats['console.log']}`);
    if (fileStats['console.error']) console.log(`   - console.error: ${fileStats['console.error']}`);
    if (fileStats['console.warn']) console.log(`   - console.warn: ${fileStats['console.warn']}`);
    if (fileStats['console.debug']) console.log(`   - console.debug: ${fileStats['console.debug']}`);
    console.log('');

    totalFiles++;
    totalReplacements += fileReplacements;

    // Update total stats
    stats['console.log'] += fileStats['console.log'];
    stats['console.error'] += fileStats['console.error'];
    stats['console.warn'] += fileStats['console.warn'];
    stats['console.debug'] += fileStats['console.debug'];
  }
}

console.log('\n📊 Summary:');
console.log(`   Files modified: ${totalFiles}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log('');
console.log('   Breakdown:');
console.log(`   - console.log → logger.debug: ${stats['console.log']}`);
console.log(`   - console.error → logger.error: ${stats['console.error']}`);
console.log(`   - console.warn → logger.warn: ${stats['console.warn']}`);
console.log(`   - console.debug → logger.debug: ${stats['console.debug']}`);
console.log('');

if (totalFiles > 0) {
  console.log('✅ Done! Please review the changes with `git diff` before committing.');
  console.log('');
  console.log('💡 Tip: Run `grep -r "console\\." src` to check for any remaining console statements.');
} else {
  console.log('✨ No console statements found! Your code is already clean.');
}
