import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('packages');
const graph = JSON.parse(fs.readFileSync('docs/PACKAGE_GRAPH.json', 'utf8'));
const packageRules = graph.packages || {};
const violations = [];
const sourceFiles = [];
const forbiddenLegacyRoots = ['/app/', '/features/', '/context/', '/hooks/', '/shared/', '/components/'];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) sourceFiles.push(full);
  }
}

function packageOf(file) {
  const rel = path.relative(ROOT, file).replaceAll('\\', '/');
  return rel.split('/')[0] || '';
}

function targetPackage(target) {
  const rel = path.relative(ROOT, target).replaceAll('\\', '/');
  if (rel.startsWith('../')) return '';
  return rel.split('/')[0] || '';
}

walk(ROOT);
const importRe = /(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g;

for (const file of sourceFiles) {
  const sourcePackage = packageOf(file);
  const rules = packageRules[sourcePackage];
  if (!rules) {
    violations.push(`Package ${sourcePackage} is missing from PACKAGE_GRAPH.json`);
    continue;
  }

  const text = fs.readFileSync(file, 'utf8');
  const externalImports = [...text.matchAll(importRe)]
    .map((match) => match[1])
    .filter((spec) => !spec.startsWith('.') && !spec.startsWith('node:'));
  for (const dependency of rules.forbiddenExternalDependencies || []) {
    if (externalImports.some((spec) => spec === dependency || spec.startsWith(`${dependency}/`))) {
      violations.push(`${path.relative(process.cwd(), file)} imports forbidden external dependency ${dependency}`);
    }
  }

  for (const match of text.matchAll(importRe)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), spec).replaceAll('\\', '/');
    const relTarget = `/${path.relative(process.cwd(), target).replaceAll('\\', '/')}`;

    if (forbiddenLegacyRoots.some((root) => relTarget.includes(root))) {
      violations.push(`${path.relative(process.cwd(), file)} -> ${spec}`);
    }
    if (relTarget.includes('/domain/')) {
      violations.push(`${path.relative(process.cwd(), file)} -> ${spec} (legacy domain dependency)`);
    }

    const dependencyPackage = targetPackage(target);
    if (dependencyPackage && dependencyPackage !== sourcePackage) {
      const allowed = new Set(rules.allowedDependencies || []);
      if (!allowed.has(dependencyPackage)) {
        violations.push(`${sourcePackage} -> ${dependencyPackage} is not allowed (${path.relative(process.cwd(), file)})`);
      }
      const normalizedSpec = spec.replaceAll('\\', '/');
      if (!normalizedSpec.endsWith(`/${dependencyPackage}/src/index.ts`)) {
        violations.push(`${path.relative(process.cwd(), file)} deep-imports ${dependencyPackage} via ${spec}; cross-package imports must use the public src/index.ts barrel`);
      }
    }
  }
}

if (violations.length) {
  console.error('Platform boundary violations:');
  for (const violation of [...new Set(violations)]) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Platform boundaries OK (${sourceFiles.length} source files scanned, PACKAGE_GRAPH.json enforced).`);
