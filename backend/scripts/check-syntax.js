import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const rootDir = process.cwd();

function collectFiles(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      results.push(...collectFiles(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

async function run() {
  const backendJs = collectFiles(path.join(rootDir, 'backend'), ['.js']);
  const rootConfig = path.join(rootDir, 'vite.config.js');
  if (fs.existsSync(rootConfig)) {
    backendJs.push(rootConfig);
  }

  for (const file of backendJs) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  }

  const frontendFiles = collectFiles(path.join(rootDir, 'frontend', 'src'), ['.js', '.jsx']);
  for (const file of frontendFiles) {
    const code = fs.readFileSync(file, 'utf8');
    const loader = file.endsWith('.jsx') ? 'jsx' : 'js';
    await esbuild.transform(code, {
      loader,
      sourcefile: file,
      jsx: 'automatic',
      format: 'esm',
    });
  }

  // Ensure zero TypeScript source files remain
  const leftoverTs = [
    ...collectFiles(path.join(rootDir, 'backend'), ['.ts', '.tsx']),
    ...collectFiles(path.join(rootDir, 'frontend'), ['.ts', '.tsx']),
    ...collectFiles(path.join(rootDir, 'src'), ['.ts', '.tsx']),
  ];
  if (leftoverTs.length > 0) {
    console.error('Leftover TypeScript files detected:', leftoverTs);
    process.exit(1);
  }

  console.log(`Syntax check passed: ${backendJs.length} backend/config JS files and ${frontendFiles.length} frontend JS/JSX files verified.`);
}

run().catch((err) => {
  console.error('Syntax check failed:', err);
  process.exit(1);
});
