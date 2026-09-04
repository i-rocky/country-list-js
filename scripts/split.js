'use strict';

// One-time migration: the ten hand-maintained aggregate files under data/
// become one file per country under countries/, plus the two lookup tables
// that are not per-country under reference/.
//
// After this runs, countries/ is the source of truth and data/ is generated.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f + '.json'), 'utf8'));

const iso3 = read('iso_alpha_3');
const names = read('names');
const continent = read('continent');
const continents = read('continents');
const regions = read('regions');
const capital = read('capital');
const currency = read('currency');
const currencyInfo = read('currency_info');
const phone = read('phone');
const provinces = read('provinces');

// The order of keys in iso_alpha_3.json determines the insertion order of
// `all`, which determines the order of names(), capitals() and ls().  That
// ordering is observable, so it is recorded explicitly rather than left to be
// an accident of how the files happen to sit on disk.

const order = Object.keys(iso3);

fs.mkdirSync(path.join(root, 'countries'), {recursive: true});
fs.mkdirSync(path.join(root, 'reference'), {recursive: true});

const write = (p, o) =>
    fs.writeFileSync(path.join(root, p), JSON.stringify(o, null, 2) + '\n');

for (const code of order) {
    const c = {
        iso2: code,
        iso3: iso3[code],
        name: names[code],
        continent: continent[code],
        region: regions[code],
        capital: capital[code],
        currency: currency[code],
        dialing_code: phone[code],
    };
    if (provinces[code]) c.provinces = provinces[code];
    write(path.join('countries', code + '.json'), c);
}

// AC and TA carry dialing codes but have no country record anywhere else in
// the data.  They are ISO 3166-1 exceptionally reserved, not assigned, so they
// stay out of countries/ and are kept as what they actually are: extra dialing
// prefixes that resolve to no country.

const orphans = Object.keys(phone).filter(k => !iso3[k]);

write(path.join('reference', 'continents.json'), continents);
write(path.join('reference', 'currencies.json'), currencyInfo);
write(path.join('reference', 'order.json'), order);
write(path.join('reference', 'unassigned-dialing-codes.json'),
    Object.fromEntries(orphans.map(k => [k, phone[k]])));

console.log('wrote %d country files', order.length);
console.log('reference: %d continents, %d currencies, %d unassigned dialing codes (%s)',
    Object.keys(continents).length, Object.keys(currencyInfo).length,
    orphans.length, orphans.join(', '));
