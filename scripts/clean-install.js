/**
 * Clean node_modules and package-lock.json, then run npm install.
 * Run from Command Prompt (cmd) with Cursor/IDE closed to avoid EPERM locks.
 * Usage: node scripts/clean-install.js
 */
import { rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const nodeModules = join(root, 'node_modules');
const lockFile = join(root, 'package-lock.json');

console.log('Cleaning for fresh install...\n');

if (existsSync(nodeModules)) {
  console.log('Removing node_modules...');
  try {
    rmSync(nodeModules, { recursive: true, maxRetries: 3 });
    console.log('  Done.\n');
  } catch (e) {
    console.error('  FAILED:', e.message);
    console.error('\nClose Cursor/IDE and any terminals using this folder, then run again from Command Prompt (cmd):');
    console.error('  cd "' + root + '"');
    console.error('  node scripts/clean-install.js');
    process.exit(1);
  }
} else {
  console.log('No node_modules folder.\n');
}

if (existsSync(lockFile)) {
  console.log('Removing package-lock.json...');
  rmSync(lockFile);
  console.log('  Done.\n');
}

console.log('Running npm install...\n');
execSync('npm install', { cwd: root, stdio: 'inherit', shell: true });
console.log('\nDone. You can run: npm run dev');
