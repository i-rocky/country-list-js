'use strict';

// Generates everything under data/ from the sources in countries/ and
// reference/.  data/ is not hand-edited and is not in git; it is built here
// and shipped in the npm tarball.
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

const order = readJson('reference/order.json');
const continents = readJson('reference/continents.json');
const currencies = readJson('reference/currencies.json');
const unassigned = readJson('reference/unassigned-dialing-codes.json');

const countries = order.map(code => readJson('countries/' + code + '.json'));

// -- checks that must hold before anything is written ------------------------

const files = fs.readdirSync(path.join(root, 'countries'))
    .filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).sort();

const fail = m => { throw new Error('build: ' + m); };

if (files.join() !== [...order].sort().join())
    fail('countries/ and reference/order.json disagree: ' +
        'only in countries/: [' + files.filter(f => !order.includes(f)) + '], ' +
        'only in order.json: [' + order.filter(o => !files.includes(o)) + ']');

for (const c of countries) {
    if (!currencies[c.currency])
        fail(c.iso2 + ' uses currency ' + c.currency + ', which reference/currencies.json does not define');
    if (!continents[c.continent])
        fail(c.iso2 + ' is on continent ' + c.continent + ', which reference/continents.json does not define');
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
];

console.log('built %d files from %d countries', written.length, countries.length);
