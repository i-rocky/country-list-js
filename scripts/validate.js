'use strict';

// Data validation, run in CI on every pull request.
//
// The point of this file is that a bad data change fails review rather than
// npm.  Merging `"AC": 247` unquoted made require() itself throw, and the
// break sat on master for nearly two years because nothing checked.

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const root = path.join(__dirname, '..');
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const order = readJson('reference/order.json');
const continents = readJson('reference/continents.json');
const currencies = readJson('reference/currencies.json');
const unassigned = readJson('reference/unassigned-dialing-codes.json');

const files = fs.readdirSync(path.join(root, 'countries'))
    .filter(f => f.endsWith('.json')).sort();

// -- schema ------------------------------------------------------------------

const validate = new Ajv({allErrors: true, strict: false})
    .compile(readJson('schema/country.schema.json'));

const countries = {};
for (const file of files) {
    const code = file.replace(/\.json$/, '');
    const c = readJson('countries/' + file);
    countries[code] = c;

    if (!validate(c))
        for (const e of validate.errors)
            problems.push(file + ': ' + (e.instancePath || '/') + ' ' + e.message);

    check(c.iso2 === code, file + ': iso2 is ' + JSON.stringify(c.iso2) +
        ' but the filename says ' + code);
}

// -- cross-file consistency --------------------------------------------------

const codes = Object.keys(countries);

check(JSON.stringify([...order].sort()) === JSON.stringify(codes),
    'reference/order.json does not match countries/: only in order.json [' +
    order.filter(c => !codes.includes(c)) + '], only in countries/ [' +
    codes.filter(c => !order.includes(c)) + ']');

check(order.length === new Set(order).size,
    'reference/order.json contains duplicates');

const dup = (field, label) => {
    const seen = new Map();
    for (const code of codes) {
        const v = countries[code][field];
        if (seen.has(v)) problems.push('duplicate ' + label + ' ' + JSON.stringify(v) +
            ': ' + seen.get(v) + ' and ' + code);
        seen.set(v, code);
    }
};
dup('iso3', 'ISO-3 code');
dup('name', 'country name');

for (const code of codes) {
    const c = countries[code];
    check(currencies[c.currency],
        code + ' uses currency ' + c.currency + ', not defined in reference/currencies.json');
    check(continents[c.continent],
        code + ' is on continent ' + c.continent + ', not defined in reference/continents.json');

    for (const p of c.provinces || []) {
        const aliases = p.alias || [];
        check(aliases.length === new Set(aliases).size,
            code + '/' + p.name + ': duplicate aliases');
        check(!aliases.includes(p.name),
            code + '/' + p.name + ': lists its own name as an alias');
    }

    // a repeated province name is legitimate when the parent region differs:
    // Bolivia has four provinces called Cercado, in Beni, Cochabamba, Oruro
    // and Tarija.  It is the (name, region) pair that has to be unique.
    const keys = (c.provinces || []).map(p => p.name + '\u0000' + (p.region || ''));
    const repeated = keys.filter((k, i) => keys.indexOf(k) !== i)
        .map(k => k.split('\u0000')[0]);
    check(!repeated.length, code + ': duplicate provinces ' +
        [...new Set(repeated)].map(n => JSON.stringify(n)).join(', '));
}

for (const code of Object.keys(unassigned))
    check(!countries[code], code + ' is in reference/unassigned-dialing-codes.json ' +
        'but countries/' + code + '.json exists');

// -- things the runtime assumes ----------------------------------------------

// index.js calls .replace() on every dialing code and .trim() on capitals;
// a number here is what took the module down
for (const code of codes)
    for (const field of ['iso3', 'name', 'continent', 'region', 'capital',
                         'currency', 'dialing_code'])
        check(typeof countries[code][field] === 'string',
            code + '.' + field + ' is ' + typeof countries[code][field] +
            ', must be a string');

for (const [code, value] of Object.entries(unassigned))
    check(typeof value === 'string',
        'unassigned dialing code ' + code + ' is ' + typeof value + ', must be a string');

// -- report ------------------------------------------------------------------

if (problems.length) {
    console.error('%d problem(s) found:\n', problems.length);
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
}

const withProvinces = codes.filter(c => countries[c].provinces);
console.log('%d countries, %d with provinces (%d subdivisions), %d currencies, ' +
    '%d continents, %d unassigned dialing codes -- all valid',
    codes.length, withProvinces.length,
    withProvinces.reduce((n, c) => n + countries[c].provinces.length, 0),
    Object.keys(currencies).length, Object.keys(continents).length,
    Object.keys(unassigned).length);
