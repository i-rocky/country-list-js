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

const order = readJson('catalog/reference/order.json');
const continents = readJson('catalog/reference/continents.json');
const currencies = readJson('catalog/reference/currencies.json');
const aliases = readJson('catalog/reference/name-aliases.json');

const files = fs.readdirSync(path.join(root, 'catalog', 'countries'))
    .filter(f => f.endsWith('.json')).sort();

// -- schema ------------------------------------------------------------------

const validate = new Ajv({allErrors: true, strict: false})
    .compile(readJson('catalog/country.schema.json'));

const countries = {};
for (const file of files) {
    const code = file.replace(/\.json$/, '');
    const c = readJson('catalog/countries/' + file);
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
    'catalog/reference/order.json does not match catalog/countries/: only in order.json [' +
    order.filter(c => !codes.includes(c)) + '], only in catalog/countries/ [' +
    codes.filter(c => !order.includes(c)) + ']');

check(order.length === new Set(order).size,
    'catalog/reference/order.json contains duplicates');

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
dup('iso_numeric', 'ISO numeric code');

for (const code of codes) {
    const c = countries[code];
    check(currencies[c.currency],
        code + ' uses currency ' + c.currency + ', not defined in catalog/reference/currencies.json');
    check(continents[c.continent],
        code + ' is on continent ' + c.continent + ', not defined in catalog/reference/continents.json');

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

const realNames = new Map(codes.map(c => [countries[c].name.toLowerCase(), c]));
for (const [alias, iso2] of Object.entries(aliases)) {
    check(countries[iso2], 'alias ' + JSON.stringify(alias) + ' points at ' + iso2 +
        ', which does not exist');
    const owner = realNames.get(alias.toLowerCase());
    check(!owner || owner === iso2, 'alias ' + JSON.stringify(alias) +
        ' is the real name of ' + owner + ' but points at ' + iso2);
}

// -- the fields added in 4.0 -------------------------------------------------

const zoneOk = z => {
    // Intl.supportedValuesOf lists ICU's legacy aliases (Asia/Calcutta, not
    // Asia/Kolkata), so constructing a formatter is the check that accepts the
    // canonical names the tz database actually publishes
    try { new Intl.DateTimeFormat('en', {timeZone: z}); return true; }
    catch { return false; }
};

for (const code of codes) {
    const c = countries[code];

    // a shared boundary is symmetric by definition
    for (const b of c.borders || []) {
        check(countries[b], code + ' borders ' + b + ', which does not exist');
        check(b !== code, code + ' is listed as its own neighbour');
        check(countries[b] && (countries[b].borders || []).includes(code),
            'one-way border: ' + code + ' lists ' + b + ' but ' + b + ' does not list ' + code);
    }

    for (const z of c.timezones || [])
        check(zoneOk(z), code + ' has timezone ' + JSON.stringify(z) +
            ', which is not an IANA identifier');

    for (const t of c.tld || [])
        check(t.startsWith('.') && t.length > 1,
            code + ' has tld ' + JSON.stringify(t) + '; the dot leads, even for ' +
            'right-to-left domains where a terminal renders it on the right');

    if (c.latlng) {
        check(Math.abs(c.latlng[0]) <= 90, code + ' latitude out of range: ' + c.latlng[0]);
        check(Math.abs(c.latlng[1]) <= 180, code + ' longitude out of range: ' + c.latlng[1]);
    }

    check(c.native_name === undefined || c.native_name !== c.name,
        code + ' repeats its name as native_name; omit the field instead');
}

// -- things the runtime assumes ----------------------------------------------

// index.js calls .replace() on every dialing code and .trim() on capitals;
// a number here is what took the module down
for (const code of codes)
    for (const field of ['iso3', 'name', 'continent', 'region', 'capital',
                         'currency', 'dialing_code'])
        check(typeof countries[code][field] === 'string',
            code + '.' + field + ' is ' + typeof countries[code][field] +
            ', must be a string');

// -- report ------------------------------------------------------------------

if (problems.length) {
    console.error('%d problem(s) found:\n', problems.length);
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
}

const withProvinces = codes.filter(c => countries[c].provinces);
const count = f => codes.filter(c => countries[c][f] !== undefined).length;

console.error('%d countries, %d with provinces (%d subdivisions), %d currencies, ' +
    '%d continents, %d aliases -- all valid',
    codes.length, withProvinces.length,
    withProvinces.reduce((n, c) => n + countries[c].provinces.length, 0),
    Object.keys(currencies).length, Object.keys(continents).length,
    Object.keys(aliases).length);

console.error('coverage: %s',
    ['iso_numeric', 'native_name', 'demonym', 'languages', 'tld', 'area',
     'latlng', 'timezones', 'borders']
        .map(f => f + ' ' + count(f)).join(', '));
