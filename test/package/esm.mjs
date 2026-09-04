import assert from 'node:assert';
import { createRequire } from 'node:module';
import country, { findByIso2, findByName, names, all, ls } from 'country-list-js';

const require = createRequire(import.meta.url);
const cjs = require('country-list-js');

let n = 0;
const ok = (label, cond) => { assert.ok(cond, label); n++; };

ok('default export is the module object', typeof country === 'object' && !!country.findByIso2);
ok('default export has 12 members', Object.keys(country).length === 12);
ok('named findByIso2', findByIso2('DK').name === 'Denmark');
ok('named findByName with alias', findByName('Türkiye').name === 'Turkey');
ok('named names()', names().length === 250);
ok('named ls()', ls('name').length === 250);
ok('named all', Object.keys(all).length === 250);

// one runtime, not two: an app that uses both require and import must not get
// two copies of `all`, or two independent runtimes
ok('ESM and CJS are the same object', country === cjs);
ok('ESM and CJS share all', all === cjs.all);

assert.deepStrictEqual(country.findByIso2('DK'), cjs.findByIso2('DK'), 'same results');
n++;

console.log('ESM: %d checks passed', n);
