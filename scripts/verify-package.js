'use strict';

// The release gate.
//
// Everything else tests the working tree.  This packs the tarball, installs it
// into a throwaway project alongside the published 3.1.8, and runs the checks
// against the *installed* package -- so a broken exports map, a file missing
// from `files`, or a data file that stopped being generated fails here rather
// than on npm.
//
// It is what stands between a mistake and 15,000 weekly downloads.

const {execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const BASELINE = process.env.BASELINE_VERSION || '3.1.8';

const run = (cmd, args, cwd) =>
    execFileSync(cmd, args, {cwd, stdio: 'inherit', env: process.env});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'country-list-js-verify-'));
let failed = false;

try {
    console.error('packing into %s', dir);
    run('npm', ['pack', '--pack-destination', dir], root);

    const tarball = fs.readdirSync(dir).find(f => f.endsWith('.tgz'));
    if (!tarball) throw new Error('npm pack produced no tarball');

    fs.writeFileSync(path.join(dir, 'package.json'),
        JSON.stringify({name: 'verify', version: '1.0.0', private: true}) + '\n');

    console.error('\ninstalling %s alongside country-list-js@%s', tarball, BASELINE);
    run('npm', ['install', './' + tarball, 'old@npm:country-list-js@' + BASELINE,
                '--no-audit', '--no-fund'], dir);

    for (const f of ['cjs.js', 'esm.mjs'])
        fs.copyFileSync(path.join(root, 'test', 'package', f), path.join(dir, f));

    console.error();
    run('node', ['cjs.js'], dir);
    run('node', ['esm.mjs'], dir);
    run('node', [path.join(root, 'test', 'package', 'browser.js')], root);

    console.error('\npackage verified against the published %s', BASELINE);
} catch (e) {
    failed = true;
    console.error('\nPACKAGE VERIFICATION FAILED: %s', e.message);
} finally {
    fs.rmSync(dir, {recursive: true, force: true});
}

process.exit(failed ? 1 : 0);
