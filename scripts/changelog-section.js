'use strict';

// Prints one version's section of CHANGELOG.md, for the GitHub release body.

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) { console.error('usage: node scripts/changelog-section.js <version>'); process.exit(1); }

const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const lines = changelog.split('\n');

const start = lines.findIndex(l => l.startsWith('## ') && l.includes(version));
if (start === -1) { console.log('See CHANGELOG.md.'); process.exit(0); }

const rest = lines.slice(start + 1);
const end = rest.findIndex(l => l.startsWith('## '));

console.log((end === -1 ? rest : rest.slice(0, end)).join('\n').trim());
