'use strict';

// Assembles the demo site into build/site/: the page from docs/, and the
// browser bundle from dist/.  The bundle used to be copied into docs/, which
// put a build output inside a source directory and meant the published site
// and the local preview were assembled two different ways.
//
// The Pages workflow publishes what this produces, so previewing build/site/
// locally shows exactly what deploys.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'build', 'site');
const bundle = path.join(root, 'dist', 'country.min.js');

if (!fs.existsSync(bundle)) {
    console.error('dist/country.min.js is missing -- run `npm run build` first');
    process.exit(1);
}

fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});
fs.cpSync(path.join(root, 'docs'), out, {recursive: true});
fs.copyFileSync(bundle, path.join(out, 'country.min.js'));

console.error('site assembled in build/site: %s', fs.readdirSync(out).sort().join(', '));
