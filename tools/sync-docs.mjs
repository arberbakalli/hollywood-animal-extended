import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs');

const filesToMirror = [
    'index.html',
    'styles.css',
    'script.js',
    'data.js',
];

const directoriesToMirror = [
    'assets',
    'data',
    'localization',
    'src',
];

mkdirSync(docs, { recursive: true });

for (const file of filesToMirror) {
    cpSync(join(root, file), join(docs, file));
}

for (const directory of directoriesToMirror) {
    rmSync(join(docs, directory), { recursive: true, force: true });
    cpSync(join(root, directory), join(docs, directory), { recursive: true });
}

console.log('Synced docs/ browser app mirror.');
