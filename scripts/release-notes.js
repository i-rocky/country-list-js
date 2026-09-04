'use strict';

// Prints one version's section of CHANGELOG.md, for the GitHub release body.
//
// A prerelease documents the release it leads to, so 4.0.0-rc.1 prints the
// 4.0.0 section with a banner saying which build it actually is. Before this,
// a prerelease matched no heading and fell back to a one-line placeholder --
// so the RC would have gone out with its breaking changes listed nowhere the
// reader could see them.

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
    console.error('usage: node scripts/release-notes.js <version>');
    process.exit(1);
}

const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const lines = changelog.split('\n');

const base = version.replace(/[-+].*$/, '');
const heading = l => l.startsWith('## ') && l.slice(3).trim() === base;

const start = lines.findIndex(heading);
if (start === -1) {
    // Loud, not a placeholder: an unannotated release is a release nobody can
    // read, and this runs immediately before publishing.
    console.error('release-notes: CHANGELOG.md has no "## %s" section for version %s',
        base, version);
    process.exit(1);
}

const rest = lines.slice(start + 1);
const end = rest.findIndex(l => l.startsWith('## '));
const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

if (version !== base)
    console.log('> **%s is a prerelease of %s.** It is published to the `next` ' +
        'dist-tag, so `npm i country-list-js` is unaffected. Install it with ' +
        '`npm i country-list-js@next`.\n', version, base);

console.log(body);
