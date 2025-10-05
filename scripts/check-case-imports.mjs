import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'src');
const exts = ['.ts', '.tsx', '.js', '.jsx'];

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (exts.includes(path.extname(entry.name))) yield full;
  }
}

function existsCaseSensitive(filePath) {
  try {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const names = fs.readdirSync(dir);
    return names.includes(base);
  } catch {
    return false;
  }
}

let mismatches = [];

for (const file of walk(ROOT)) {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content))) {
    const spec = match[1];
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;

    // Resolve alias "@/..." to absolute
    let rel = spec.startsWith('@/')
      ? path.join(ROOT, spec.replace('@/', ''))
      : path.join(path.dirname(file), spec);

    // Try to find file with extension
    const withExt = exts.map(e => rel + e).find(f => fs.existsSync(f)) ||
                    (fs.existsSync(rel) ? rel : null);

    if (withExt && !existsCaseSensitive(withExt)) {
      mismatches.push({
        importer: file.replace(process.cwd(), ''),
        importPath: spec,
        resolved: withExt.replace(process.cwd(), '')
      });
    }
  }
}

if (mismatches.length) {
  console.error('❌ Case mismatches found:\n');
  mismatches.forEach(m => {
    console.error(`  ${m.importer}`);
    console.error(`    imports: ${m.importPath}`);
    console.error(`    resolved: ${m.resolved}\n`);
  });
  process.exit(1);
} else {
  console.log('✅ No case mismatches found');
}
