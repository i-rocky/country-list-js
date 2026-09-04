'use strict';

// Generates everything under data/ from the sources in catalog/.  data/ is not
// hand-edited and is not in git; it is built here and shipped in the npm
// tarball, where it is private to the runtime.
//
//   countries.json          the compiled records, joined and in name order
//   provinces.json          subdivisions, keyed by ISO-2.  Kept out of
//                           countries.json because they are most of the bytes
//                           and most callers never read them
//   retired-currencies.json withdrawn ISO 4217 codes and their successors
//   name-aliases.json       alternative names findByName accepts

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const order = readJson('catalog/reference/order.json');
const continents = readJson('catalog/reference/continents.json');
const currencies = readJson('catalog/reference/currencies.json');
const retired = readJson('catalog/reference/retired-currencies.json');
const aliases = readJson('catalog/reference/name-aliases.json');


const countries = order.map(code => readJson('catalog/countries/' + code + '.json'));

// -- checks that must hold before anything is written ------------------------

const files = fs.readdirSync(path.join(root, 'catalog', 'countries'))
    .filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).sort();

const fail = m => { throw new Error('build: ' + m); };

if (files.join() !== [...order].sort().join())
    fail('catalog/countries/ and catalog/reference/order.json disagree: ' +
        'only in catalog/countries/: [' + files.filter(f => !order.includes(f)) + '], ' +
        'only in order.json: [' + order.filter(o => !files.includes(o)) + ']');

for (const [alias, iso2] of Object.entries(aliases)) {
    if (!order.includes(iso2))
        fail('alias ' + JSON.stringify(alias) + ' points at ' + iso2 + ', which does not exist');
    if (countries.some(c => c.name === alias && c.iso2 !== iso2))
        fail('alias ' + JSON.stringify(alias) + ' is another country\'s real name');
}

for (const [code, r] of Object.entries(retired)) {
    if (!currencies[r.successor])
        fail('retired currency ' + code + ' names successor ' + r.successor +
            ', which catalog/reference/currencies.json does not define');
    for (const iso2 of r.countries)
        if (!order.includes(iso2))
            fail('retired currency ' + code + ' names country ' + iso2 + ', which does not exist');
}

for (const c of countries) {
    if (!currencies[c.currency])
        fail(c.iso2 + ' uses currency ' + c.currency + ', which catalog/reference/currencies.json does not define');
    if (!continents[c.continent])
        fail(c.iso2 + ' is on continent ' + c.continent + ', which catalog/reference/continents.json does not define');
}

// -- output ------------------------------------------------------------------

// Cleared first: a file that stops being generated must stop being shipped,
// and `files` ships the whole directory.
const out = p => path.join(root, 'data', p);
fs.rmSync(out(''), {recursive: true, force: true});
fs.mkdirSync(out(''), {recursive: true});

const write = (name, value, pretty) => {
    fs.writeFileSync(out(name), JSON.stringify(value, null, pretty ? 2 : 0) + '\n');
    return name;
};

// the compiled records, in canonical order, with continent and currency
// already resolved -- exactly the shape index.js needs
const compiled = countries.map(c => ({
    iso2: c.iso2,
    iso3: c.iso3,
    name: c.name,
    continent: continents[c.continent],
    region: c.region,
    capital: c.capital,
    currency: c.currency,
    currency_symbol: currencies[c.currency].symbol,
    currency_decimal: currencies[c.currency].decimal,
    dialing_code: c.dialing_code,
    iso_numeric: c.iso_numeric,
    native_name: c.native_name,
    demonym: c.demonym,
    languages: c.languages,
    tld: c.tld,
    area: c.area,
    latlng: c.latlng,
    timezones: c.timezones,
    borders: c.borders,
}));

const written = [
    write('countries.json', compiled),

    write('provinces.json', Object.fromEntries(
        countries.filter(c => c.provinces).map(c => [c.iso2, c.provinces])), true),

    // codes that ISO 4217 has retired, kept resolvable so that a lookup which
    // works today does not start answering undefined once the data is corrected
    write('retired-currencies.json', retired, true),

    // alternative country names: native forms, official long forms and the
    // names countries carried before they were renamed
    write('name-aliases.json', aliases, true),
];

// -- generated types ---------------------------------------------------------

// Literal unions for the ISO codes, so an editor autocompletes all 250 and a
// typo is a compile error rather than an undefined at runtime.

const union = values => [...new Set(values)].sort()
    .map(v => "    | '" + v + "'").join('\n');

fs.mkdirSync(path.join(root, 'src'), {recursive: true});
fs.writeFileSync(path.join(root, 'src', 'generated.ts'),
    '// Generated by scripts/build-data.js from catalog/countries/ and catalog/reference/.\n' +
    '// Do not edit: your changes will be overwritten by the next build.\n\n' +
    '/** ISO 3166-1 alpha-2 country code. */\nexport type Iso2 =\n' +
        union(countries.map(c => c.iso2)) + ';\n\n' +
    '/** ISO 3166-1 alpha-3 country code. */\nexport type Iso3 =\n' +
        union(countries.map(c => c.iso3)) + ';\n\n' +
    '/** ISO 4217 currency code in current use, plus the retired codes that\n' +
    ' *  stay resolvable through findByCurrency. */\nexport type CurrencyCode =\n' +
        union([...countries.map(c => c.currency), ...Object.keys(retired)]) + ';\n\n' +
    '/** Continent name, as returned on a country record. */\nexport type ContinentName =\n' +
        union(Object.values(continents)) + ';\n');

// stderr, not stdout: this runs from `prepare`, inside `npm pack --json`.
console.error('built %d files from %d countries, and src/generated.ts',
    written.length, countries.length);
