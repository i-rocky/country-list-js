'use strict';

// One-time import of the additive fields: borders, timezones, ISO numeric,
// native name, TLD, area, coordinates, demonym and languages.
//
// Timezones come from the IANA tz database's zone1970.tab, which is explicitly
// public domain and is the authoritative country-to-zone mapping.  Everything
// else comes from porimol/countryinfo (MIT).  Population is deliberately not
// imported: it changes every year and there is no story for keeping 250
// figures current.
//
// Kept so the import is reproducible and reviewable, not so it runs in CI.
//
//   node scripts/import-enrichment.js <countryinfo/data> <zone.tab> <zone1970.tab>

const fs = require('fs');
const path = require('path');

const [source, zoneTab, zone1970Tab] = process.argv.slice(2);
if (!source || !zoneTab || !zone1970Tab) {
    console.error('usage: node scripts/import-enrichment.js <countryinfo data dir> <zone.tab> <zone1970.tab>');
    process.exit(1);
}

const root = path.join(__dirname, '..');
const countries = {};
for (const f of fs.readdirSync(path.join(root, 'catalog', 'countries'))) {
    const c = JSON.parse(fs.readFileSync(path.join(root, 'catalog', 'countries', f), 'utf8'));
    countries[c.iso2] = c;
}

// -- timezones, from IANA ----------------------------------------------------

// Intl.supportedValuesOf lists the *legacy* aliases ICU prefers -- it reports
// Asia/Calcutta, not Asia/Kolkata -- while zone1970.tab carries the modern
// canonical names.  Constructing a formatter accepts either, so that is the
// check.  The canonical names are what we keep.
const valid = z => {
    try { new Intl.DateTimeFormat('en', {timeZone: z}); return true; }
    catch { return false; }
};

const zones = {};
const unknownZones = new Set();

const readTab = file => {
    const rows = [];
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!line || line[0] === '#') continue;
        const [codes, , zone] = line.split('\t');
        if (zone) rows.push([codes.split(','), zone]);
    }
    return rows;
};

// zone.tab first: it names a zone per country, so Denmark is
// Europe/Copenhagen.  zone1970.tab collapses countries whose civil time has
// agreed since 1970 into one row -- DE,DK,NO,SE,SJ all share Europe/Berlin --
// which is correct but not what anyone asking for Denmark's timezone wants.
// zone1970 is still read afterwards, to cover anything zone.tab omits.
for (const file of [zoneTab, zone1970Tab])
    for (const [codes, zone] of readTab(file)) {
        if (!valid(zone)) { unknownZones.add(zone); continue; }
        for (const code of codes) {
            if (!countries[code]) continue;
            if (file === zone1970Tab && zones[code]) continue;   // zone.tab wins
            const list = zones[code] || (zones[code] = []);
            if (!list.includes(zone)) list.push(zone);
        }
    }
// tzdb assigns no zone to XK: Kosovo is user-assigned in ISO 3166-1 and the
// database has no row for it.  Kosovo keeps CET/CEST with Serbia.
if (countries.XK && !zones.XK) zones.XK = ['Europe/Belgrade'];

for (const code of Object.keys(zones)) zones[code].sort();

// -- everything else, from countryinfo ---------------------------------------

const byIso3 = Object.fromEntries(Object.values(countries).map(c => [c.iso3, c.iso2]));

// countryinfo's borders are mostly ISO-3, but not uniformly: Kosovo appears as
// the unofficial KOS rather than our XKX, and at least one entry is a bare
// ISO-2 code
const BORDER_FIXUPS = {KOS: 'XK'};
const toIso2 = code => {
    code = String(code).toUpperCase();
    return BORDER_FIXUPS[code] || byIso3[code] || (countries[code] ? code : null);
};
const extra = {};
const unmappedBorders = new Set();

for (const file of fs.readdirSync(source).filter(f => f.endsWith('.json'))) {
    let o;
    try { o = JSON.parse(fs.readFileSync(path.join(source, file), 'utf8')); }
    catch { continue; }

    const iso2 = o.ISO && o.ISO.alpha2 && o.ISO.alpha2.toUpperCase();
    if (!iso2 || !countries[iso2]) continue;

    const e = extra[iso2] || (extra[iso2] = {});

    if (o.ISO.numeric) e.iso_numeric = String(o.ISO.numeric).padStart(3, '0');
    if (o.nativeName && o.nativeName !== countries[iso2].name) e.native_name = o.nativeName;
    if (o.demonym) e.demonym = o.demonym;
    if (Array.isArray(o.languages) && o.languages.length) e.languages = o.languages;
    // internationalized ccTLDs written right-to-left arrive with the dot at
    // the end, because whoever typed them copied what the screen rendered.
    // Logically the dot leads: Algeria's is '.الجزائر', not 'الجزائر.'
    if (Array.isArray(o.tld) && o.tld.length)
        e.tld = o.tld.map(t => t.endsWith('.') && !t.startsWith('.')
            ? '.' + t.slice(0, -1) : t);
    if (typeof o.area === 'number' && o.area > 0) e.area = o.area;
    if (Array.isArray(o.latlng) && o.latlng.length === 2) e.latlng = o.latlng;

    if (Array.isArray(o.borders)) {
        const b = [];
        for (const code of o.borders) {
            const n = toIso2(code);
            if (n) b.push(n); else unmappedBorders.add(code);
        }
        if (b.length) e.borders = [...new Set(b)].sort();
    }
}

// every country in our set gets an entry, so that a country countryinfo has
// no file for -- Kosovo -- can still receive the reverse of a border its
// neighbours claim
for (const iso2 of Object.keys(countries)) if (!extra[iso2]) extra[iso2] = {};

// -- borders must be symmetric -----------------------------------------------

// A shared boundary is symmetric by definition, but the source is not: it has
// Nepal bordering China without China bordering Nepal.  Take the union and
// record what had to be added, rather than dropping half of a real border.

const added = [];
for (const [iso2, e] of Object.entries(extra))
    for (const other of e.borders || []) {
        if (!extra[other]) continue;
        const back = extra[other].borders || (extra[other].borders = []);
        if (!back.includes(iso2)) { back.push(iso2); back.sort(); added.push(other + ' -> ' + iso2); }
    }

// -- write -------------------------------------------------------------------

let written = 0;
for (const [iso2, e] of Object.entries(extra)) {
    const c = countries[iso2];
    if (zones[iso2]) e.timezones = zones[iso2];

    // keep a stable field order: identity, geography, then the new detail
    const merged = {};
    for (const k of ['iso2', 'iso3', 'iso_numeric', 'name', 'native_name',
                     'demonym', 'continent', 'region', 'capital', 'currency',
                     'languages', 'dialing_code', 'tld', 'area', 'latlng',
                     'timezones', 'borders', 'provinces']) {
        if (k in e) merged[k] = e[k];
        else if (k in c) merged[k] = c[k];
    }
    fs.writeFileSync(path.join(root, 'catalog', 'countries', iso2 + '.json'),
        JSON.stringify(merged, null, 2) + '\n');
    written++;
}

const coverage = f => Object.values(extra).filter(e => e[f] !== undefined).length;
console.log('enriched %d of %d countries\n', written, Object.keys(countries).length);
for (const f of ['iso_numeric', 'native_name', 'demonym', 'languages', 'tld',
                 'area', 'latlng', 'timezones', 'borders'])
    console.log('  %s %s / 250', f.padEnd(13), String(coverage(f)).padStart(3));

console.log('\nzones in zone1970.tab this Node does not recognise: %d%s',
    unknownZones.size, unknownZones.size ? ' (' + [...unknownZones].join(', ') + ')' : '');
console.log('border codes that map to no country in our set: %d%s',
    unmappedBorders.size, unmappedBorders.size ? ' (' + [...unmappedBorders].join(', ') + ')' : '');
console.log('reverse borders added to make the relation symmetric: %d%s', added.length,
    added.length ? '\n  ' + added.join('\n  ') : '');
