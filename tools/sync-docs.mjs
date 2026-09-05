import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs');

const filesToMirror = [
    'index.html',
    'script.js',
];

mkdirSync(docs, { recursive: true });

for (const file of filesToMirror) {
    cpSync(join(root, file), join(docs, file));
}

rmSync(join(docs, 'src'), { recursive: true, force: true });
cpSync(join(root, 'src'), join(docs, 'src'), { recursive: true });

console.log('Synced docs/ browser app mirror.');
