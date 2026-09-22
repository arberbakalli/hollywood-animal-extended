#!/usr/bin/env node
/**
 * Clears a stale .git/*.lock, and refuses to clear a live one.
 *
 * Why this exists: on this repo a second tool commits alongside the editor, and
 * on Windows the loser of that race can leave a zero-byte `HEAD.lock` behind
 * after its commit has already landed. Git then refuses every later write with
 * "cannot lock ref 'HEAD'", and its own advice is to delete the file manually.
 *
 * Deleting it manually is fine when the lock is dead and catastrophic when it
 * is not: removing a lock out from under a running `git commit` lets two
 * writers touch the same ref. So this checks first, and says why when it
 * declines.
 *
 * A lock is treated as stale only when ALL of these hold:
 *   - no git process is running
 *   - the file is empty (a live writer has usually written the new ref to it)
 *   - it is older than STALE_AFTER_MS
 *
 * Usage: npm run git:unlock
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const GIT_DIR = '.git';
const STALE_AFTER_MS = 10_000;

function gitProcessRunning() {
    const probe = process.platform === 'win32'
        ? ['tasklist', ['/FI', 'IMAGENAME eq git.exe', '/NH']]
        : ['pgrep', ['-x', 'git']];

    try {
        const out = execFileSync(probe[0], probe[1], { encoding: 'utf8' });
        return process.platform === 'win32' ? /git\.exe/i.test(out) : out.trim().length > 0;
    } catch {
        // pgrep exits non-zero when nothing matches; tasklist prints a notice.
        return false;
    }
}

const locks = readdirSync(GIT_DIR)
    .filter(name => name.endsWith('.lock'))
    .map(name => join(GIT_DIR, name));

if (locks.length === 0) {
    console.log('No .git lock files. Nothing to do.');
    process.exit(0);
}

if (gitProcessRunning()) {
    console.error('A git process is running. Refusing to touch:');
    locks.forEach(lock => console.error(`  ${lock}`));
    console.error('\nWait for it to finish, then run this again.');
    process.exit(1);
}

let cleared = 0;
for (const lock of locks) {
    const { size, mtimeMs } = statSync(lock);
    const ageMs = Date.now() - mtimeMs;

    if (size > 0) {
        console.error(`Kept ${lock}: ${size} bytes, so a writer may have staged a ref in it.`);
        continue;
    }
    if (ageMs < STALE_AFTER_MS) {
        console.error(`Kept ${lock}: only ${Math.round(ageMs / 1000)}s old, may still be live.`);
        continue;
    }

    unlinkSync(lock);
    console.log(`Cleared stale ${lock} (empty, ${Math.round(ageMs / 1000)}s old).`);
    cleared += 1;
}

process.exit(cleared === locks.length ? 0 : 1);
