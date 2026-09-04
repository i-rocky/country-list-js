'use strict';

// Generates everything under data/ from the sources in catalog/.  data/ is not
// hand-edited and is not in git; it is built here and shipped in the npm
// tarball.
//
// Two kinds of output:
//
//   data/countries.json  the compiled records the runtime loads, already
//                        joined and in canonical order.  Provinces are not
//                        inlined here: they are 121KB of the 170KB and live
//                        in data/provinces.json, which has to be generated
//                        anyway for callers that deep-import it.  Duplicating
//                        them would be 40% of the tarball and a second copy
//                        free to drift.
//
//   data/*.json          the ten aggregate files 3.1.8 shipped.  They are
//                        deep-imported in the wild (`require('country-list-js/
//                        data/names.json')`) so they keep their exact shape.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const order = readJson('catalog/reference/order.json');
const continents = readJson('catalog/reference/continents.json');
const currencies = readJson('catalog/reference/currencies.json');
const unassigned = readJson('catalog/reference/unassigned-dialing-codes.json');
const retired = readJson('catalog/reference/retired-currencies.json');
const aliases = readJson('catalog/reference/name-aliases.json');

// Shipped since 3.1.x and deep-importable, so it keeps shipping. Nothing in
// the runtime reads it: it is the prototype of the subdivision meta-layer from
// issue #28, and it covers Spain only.
const politicalDivisions = readJson('catalog/reference/political-divisions.json');

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

const out = p => path.join(root, 'data', p);
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

const pick = f => Object.fromEntries(countries.map(c => [c.iso2, c[f]]));

const written = [
    write('countries.json', compiled),
    write('iso_alpha_3.json', pick('iso3'), true),
    write('names.json', pick('name'), true),
    write('continent.json', pick('continent'), true),
    write('regions.json', pick('region'), true),
    write('capital.json', pick('capital'), true),
    write('currency.json', pick('currency'), true),
    write('provinces.json', Object.fromEntries(
        countries.filter(c => c.provinces).map(c => [c.iso2, c.provinces])), true),

    // dialing codes carry the unassigned prefixes too, appended after the
    // countries.  The order matters: index.js sorts prefixes by length and
    // the sort is stable, so key order decides which of the +1 territories
    // leads the result for a North American number.
    write('phone.json', {...pick('dialing_code'), ...unassigned}, true),

    write('continents.json', continents, true),
    write('currency_info.json', currencies, true),

    // codes that ISO 4217 has retired, kept resolvable so that a lookup which
    // works today does not start answering undefined once the data is corrected
    write('retired-currencies.json', retired, true),

    // alternative country names -- native forms, official long forms, and the
    // modern ISO short names for the countries this dataset still lists under
    // their older name
    write('name-aliases.json', aliases, true),
    write('political_divisions.json', politicalDivisions, true),
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
