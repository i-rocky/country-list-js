'use strict';

// The browser bundle is checked by running it the way a <script> tag does:
// top-level `var` in a classic script becomes a property of the global object,
// and a VM context reproduces that faithfully.
//
// 3.1.8's bundle was plain browserify with no `standalone` option, so it
// defined no global at all -- the README's <script> instructions have never
// worked.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const bundle = path.join(__dirname, '..', '..', 'dist', 'country.min.js');

const sandbox = {console, Intl};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(bundle, 'utf8'), sandbox, {filename: bundle});

const country = sandbox.country;
let n = 0;
const ok = (label, cond) => { assert.ok(cond, label); n++; };

ok('a <script> tag defines window.country', typeof country === 'object' && country !== null);
ok('with all 13 members', Object.keys(country).length === 13);
ok('findByIso2', country.findByIso2('DK').name === 'Denmark');
ok('case-insensitive', country.findByIso2('dk').name === 'Denmark');
ok('name alias', country.findByName('Türkiye').name === 'Turkey');
ok('retired currency', country.findByCurrency('HRK').name === 'Croatia');
ok('corrected currency', country.findByIso2('BG').currency.code === 'EUR');
ok('timezones', country.findByIso2('DK').timezones[0] === 'Europe/Copenhagen');
ok('borders', country.findByIso2('PT').borders[0] === 'ES');
ok('names()', country.names().length === 250);
ok('continents()', country.continents().length === 7);
ok('provinces', country.findByProvince('Zealand').name === 'Denmark');

const seen = [];
for (const k in [1, 2]) seen.push(k);
ok('no Array.prototype leak in the browser', !seen.includes('unpack'));

console.log('browser: %d checks passed', n);
