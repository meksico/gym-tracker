#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Count commits after the pending one (+1 because pre-commit fires before the commit lands)
const count = parseInt(execSync('git rev-list --count HEAD', { cwd: root }).toString().trim(), 10) + 1;

const content = `export const APP_VERSION = 'r${count}';\n`;
writeFileSync(join(root, 'src/lib/version.js'), content);
process.stdout.write(`version: r${count}\n`);
