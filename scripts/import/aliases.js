'use strict';

// One-time import of country name aliases.
//
// Bulk source: porimol/countryinfo (MIT), altSpellings + nativeName + name.
// Everything is filtered against our own data -- an alias is dropped if it is
// an ISO code, if it repeats the name we already carry, or if it is claimed by
// more than one country.  A curated list adds the forms people actually type
// that the bulk source is missing.
//
// This exists so the import is reproducible and reviewable, not so it runs in
// CI.  catalog/reference/name-aliases.json is checked in and hand-editable
// after this.

const fs = require('fs');
const path = require('path');

const source = process.argv[2];
if (!source) {
    console.error('usage: node scripts/import/aliases.js <path to countryinfo/countryinfo/data>');
    process.exit(1);
}

const root = path.join(__dirname, '..', '..');
const ours = {};
for (const f of fs.readdirSync(path.join(root, 'catalog', 'countries'))) {
    const c = JSON.parse(fs.readFileSync(path.join(root, 'catalog', 'countries', f), 'utf8'));
    ours[c.iso2] = c;
}

// forms people type that the bulk source does not carry
const CURATED = {
    US: ['USA', 'U.S.A.', 'U.S.', 'United States of America', 'America'],
    GB: ['UK', 'U.K.', 'Great Britain', 'Britain', 'England'],
    AE: ['UAE', 'U.A.E.'],
    CD: ['DR Congo', 'DRC', 'Congo-Kinshasa', 'Congo (Kinshasa)'],
    CG: ['Congo-Brazzaville', 'Congo (Brazzaville)'],
    MM: ['Burma'],
    SZ: ['Eswatini', 'Kingdom of Eswatini'],
    MK: ['North Macedonia', 'Republic of North Macedonia'],
    CZ: ['Czechia'],
    TR: ['Turkiye', 'Türkiye'],
    CV: ['Cabo Verde'],
    TL: ['Timor-Leste'],
    CI: ['Côte d’Ivoire', "Côte d'Ivoire", 'Cote d’Ivoire', "Cote d'Ivoire"],
    VA: ['Holy See', 'Vatican City', 'Vatican City State'],
    NL: ['Holland', 'The Netherlands'],
    KR: ['Republic of Korea', 'ROK'],
    KP: ['DPRK', "Democratic People's Republic of Korea"],
    RU: ['Russian Federation'],
    LA: ['Laos', "Lao People's Democratic Republic"],
    SY: ['Syrian Arab Republic'],
    TZ: ['Tanzania', 'United Republic of Tanzania'],
    BO: ['Plurinational State of Bolivia'],
    VE: ['Bolivarian Republic of Venezuela'],
    IR: ['Islamic Republic of Iran', 'Persia'],
    MD: ['Republic of Moldova'],
    VN: ['Viet Nam'],
    BN: ['Brunei Darussalam'],
    PS: ['Palestine', 'State of Palestine'],
    XK: ['Kosovo', 'Republic of Kosovo'],
};

const claims = new Map();          // alias -> Set of iso2
const curated = new Set();         // aliases we asked for by hand
const claim = (alias, iso2, byHand) => {
    alias = String(alias).trim();
    if (!alias) return;
    if (!claims.has(alias)) claims.set(alias, new Set());
    claims.get(alias).add(iso2);
    if (byHand) curated.add(alias);
};

for (const file of fs.readdirSync(source).filter(f => f.endsWith('.json'))) {
    let o;
    try { o = JSON.parse(fs.readFileSync(path.join(source, file), 'utf8')); }
    catch { continue; }

    const iso2 = o.ISO && o.ISO.alpha2 && o.ISO.alpha2.toUpperCase();
    if (!iso2 || !ours[iso2]) continue;      // dissolved entities, e.g. AN, CS

    for (const a of [].concat(o.altSpellings || [], o.nativeName || [], o.name || []))
        claim(a, iso2);
}

for (const [iso2, list] of Object.entries(CURATED))
    for (const a of list) claim(a, iso2, true);

const byName = new Map(Object.values(ours).map(c => [c.name.toLowerCase(), c.iso2]));
const aliases = {};
const rejected = {ambiguous: [], isoCode: [], sameAsName: [], clashesWithName: []};

for (const [alias, owners] of [...claims].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (owners.size > 1) { rejected.ambiguous.push(alias); continue; }

    const iso2 = [...owners][0];
    const c = ours[iso2];

    // findByIso2 and findByIso3 already answer bare codes, and findByName is
    // for names.  The curated list overrides this: 'USA' is the ISO-3 code for
    // the United States and also what people type into a country name field.
    if (!curated.has(alias) && (alias === c.iso2 || alias === c.iso3)) {
        rejected.isoCode.push(alias);
        continue;
    }

    // findByName already answers this
    if (alias.toLowerCase() === c.name.toLowerCase()) { rejected.sameAsName.push(alias); continue; }

    // never let an alias shadow another country's real name
    const owner = byName.get(alias.toLowerCase());
    if (owner && owner !== iso2) { rejected.clashesWithName.push(alias); continue; }

    aliases[alias] = iso2;
}

fs.writeFileSync(path.join(root, 'catalog', 'reference', 'name-aliases.json'),
    JSON.stringify(aliases, null, 2) + '\n');

console.error('kept %d aliases for %d countries',
    Object.keys(aliases).length, new Set(Object.values(aliases)).size);
for (const [why, list] of Object.entries(rejected))
    if (list.length) console.error('  rejected %d as %s%s', list.length, why,
        list.length <= 6 ? ': ' + list.join(', ') : '');
