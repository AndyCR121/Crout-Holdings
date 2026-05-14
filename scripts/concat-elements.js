#!/usr/bin/env node
/**
 * concat-elements.js  <project-name>
 *
 * After `ng build --configuration elements`, Angular 19 may split output into
 * multiple ES-module chunks (chunk-XXXX.js).  WordPress cannot dynamically
 * import those chunks when the script is enqueued without a module map.
 *
 * This script:
 *   1. Reads all *.js files in dist/<project>/  (excluding polyfills.js)
 *   2. Concatenates them into a single main.js  (polyfills stay separate)
 *   3. Deletes the leftover chunk-*.js files
 *
 * Run automatically via `npm run build:elements`.
 */

const fs   = require('fs');
const path = require('path');

const project = process.argv[2];
if (!project) {
  console.error('Usage: node concat-elements.js <project-name>');
  process.exit(1);
}

const distDir = path.resolve(__dirname, '..', project, 'dist', project);

if (!fs.existsSync(distDir)) {
  console.error(`dist dir not found: ${distDir}`);
  process.exit(1);
}

const allJs = fs
  .readdirSync(distDir)
  .filter(f => f.endsWith('.js') && f !== 'polyfills.js')
  .sort(); // stable order: main.js first, then chunk-*.js

if (allJs.length === 0) {
  console.log('No JS files to process.');
  process.exit(0);
}

// Separate main from chunks
const mainFile   = allJs.find(f => f === 'main.js');
const chunkFiles = allJs.filter(f => f !== 'main.js');

if (chunkFiles.length === 0) {
  console.log('Single main.js — no concatenation needed.');
  process.exit(0);
}

console.log(`Concatenating ${chunkFiles.length} chunk(s) into main.js …`);

// Read existing main first, then append chunks
const parts = [
  mainFile ? fs.readFileSync(path.join(distDir, mainFile), 'utf8') : '',
  ...chunkFiles.map(f => fs.readFileSync(path.join(distDir, f), 'utf8')),
];

fs.writeFileSync(path.join(distDir, 'main.js'), parts.join('\n'), 'utf8');

// Remove chunk files
for (const chunk of chunkFiles) {
  fs.unlinkSync(path.join(distDir, chunk));
  console.log(`  Removed ${chunk}`);
}

console.log('Done. dist ready for WordPress.');
