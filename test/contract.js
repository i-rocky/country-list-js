'use strict';

// The compatibility contract, and the machine-checked half of the changelog.
//
// test/fixtures/baseline-3.1.8.json captures the observable surface of the
// real, published country-list-js@3.1.8.  4.0 breaks with it deliberately in
// places; every one of those breaks is declared here with a reason, and
// everything not declared still has to match byte for byte.  An undeclared
// difference is a regression, and a declared one that turns out to be
// identical fails too, so the list cannot go stale.

const expect = require('chai').expect;
const assert = require('assert');
const base = require('./fixtures/baseline-3.1.8.json');
const country = require('../index');

// -- breaking changes that apply to the whole surface ------------------------
//
// Declared once rather than country by country.  Each migrates the baseline
// into what 4.0 promises, so every value not covered by one still compares
// exactly.

const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u02bb\u2018\u2019]/g, "'").toLowerCase();

const BREAKING = [{
    what: 'currency.symbol and currency.decimal come from CLDR and ISO 4217',
    why: 'decimal was the string "2" and is now the number 2 -- the ISO 4217 ' +
         'minor unit exponent, which 3.1.8 had wrong for 21 currencies (HUF ' +
         'and IDR are 2, not 0; IQD is 3). symbol is the one CLDR gives the ' +
         'currency, so DKK is "kr" rather than "Dkr". Neither is compared ' +
         'against 3.1.8 here; test/lookup.js pins them to the standards.',
    migrate: c => { if (c.currency) c.currency = {code: c.currency.code}; },
}, {
    what: 'region and continent follow the UN M49 geoscheme',
    why: '3.1.8\'s region was free text: "Western African" beside "Western ' +
         'Africa", the Netherlands in "Nordic Countries", the Cocos Islands ' +
         'in "Central America". Every region is now an M49 name, and the ' +
         'continent is the one M49 puts the region in, so Cyprus is Western ' +
         'Asia. test/fields.js pins the scheme; nothing is compared to 3.1.8.',
    migrate: c => { delete c.region; delete c.continent; },
}, {
    what: 'capital is undefined where a territory has none, and is spelled with its diacritics',
    why: '3.1.8 carried "" for the six territories with no capital, and ' +
         'transliterated the rest -- Bogota, Reykjavik, Asuncion. A capital ' +
         'is now spelled as it is spelled, and a lookup that misses is ' +
         'retried with diacritics folded, so findByCapital("Bogota") still ' +
         'answers. Capitals are compared folded here; the ones that changed ' +
         'in substance are declared per country.',
    // '' becomes null in the baseline and undefined becomes null on the live
    // side, so that a territory gaining a capital would still be noticed
    migrate: c => { c.capital = c.capital === '' ? null : c.capital; },
    normalise: c => { c.capital = c.capital ? fold(c.capital) : null; },
}, {
    what: 'dialing_code is the E.164 country calling code, and area codes are area_codes',
    why: '3.1.8 mixed "45", "+1-268", "+44-1481" and "+1-809 and 1-829" in ' +
         'one string field, and " " for Heard Island. dialing_code is now ' +
         'digits only -- "1" for Antigua -- and the part that identifies a ' +
         'territory within a shared code is area_codes: ["268"]. Undefined ' +
         'where there is no telephone service.',
    migrate: c => {
        const m = c.dialing_code.trim().match(/^\+?(\d+)(?:-(\d+))?(?: and 1-(\d+))?$/);
        c.dialing_code = m ? m[1] : null;
        const areas = m ? [m[2], m[3]].filter(Boolean) : [];
        if (areas.length) c.area_codes = areas;
    },
    normalise: c => { if (c.dialing_code === undefined) c.dialing_code = null; },
}, {
    what: 'every subdivision carries the same four keys',
    why: '3.1.8 had three shapes -- {name, alias}, plus "short" for 14 ' +
         'countries and "region" for 5 -- so a caller had to test for a key ' +
         'before reading it. Every entry is now {name, code, region, alias}, ' +
         'null where the country has no such thing. "short" is renamed "code": ' +
         'it holds a subdivision code, not an abbreviated name.',
    migrate: c => {
        if (!c.provinces) return;
        c.provinces = c.provinces.map(p => ({
            name: p.name,
            code: p.short === undefined ? null : p.short,
            region: p.region === undefined ? null : p.region,
            alias: p.alias === undefined ? null : p.alias,
        }));
    },
}, {
    what: 'an alias that is only the name without its diacritics is gone',
    why: '176 subdivision aliases were the ASCII form of the name -- Cordoba ' +
         'for Córdoba. A lookup that misses is now retried with diacritics ' +
         'folded, so findByProvince("Cordoba") still answers, and the list ' +
         'carries only the alternative names that are actually different.',
    migrate: c => {
        for (const p of c.provinces || []) {
            if (!Array.isArray(p.alias)) continue;
            p.alias = p.alias.filter(a => fold(a) !== fold(p.name));
            if (!p.alias.length) p.alias = null;
        }
    },
}];

// Finders whose return type changed from "country, list, or undefined,
// depending on how many matched" to a plain list.  The other three read a
// field the data guarantees unique and answer a country or undefined.
//
// 3.1.8 made every caller test the shape of a result before using it, and the
// shape depended on the data rather than on the call. Recorded calls to these
// four are migrated to what a list looks like; the matched countries and their
// order are then compared exactly as before.

const NOW_A_LIST = ['findByCapital', 'findByCurrency', 'findByProvince',
                    'findByPhoneNbr'];

for (const c of base.calls)
    if (NOW_A_LIST.includes(c.fn))
        c.out = {v: 'u' in c.out ? [] : [].concat(c.out.v)};

// Members 3.1.8 exported that 4.0 does not.

const REMOVED_MEMBERS = {
    cache: 'internal memoisation, exposed on the module because it always ' +
           'had been. Lookups are index reads and keep no state, so there is ' +
           'nothing left to expose.',
};

const isCountry = v => v && typeof v === 'object' && v.code && typeof v.code === 'object';

(function migrate(v) {
    if (Array.isArray(v)) return v.forEach(migrate);
    if (!v || typeof v !== 'object') return;
    if (isCountry(v)) for (const b of BREAKING) b.migrate(v);
    Object.values(v).forEach(migrate);
})(base);

// applied to both sides before a comparison
const normalise = v => {
    if (Array.isArray(v)) v.forEach(normalise);
    else if (isCountry(v)) for (const b of BREAKING) if (b.normalise) b.normalise(v);
    return v;
};

// Country records that intentionally differ from published 3.1.8.

const STRING_ALIAS =
    'one province alias was a bare string rather than an array (ET/SNNPR, ' +
    'TR/Mugla, VN/Binh Phuoc).  String indexOf is a substring search, so ' +
    'findByProvince("B") answered Vietnam and the empty string matched all ' +
    'three.  The three are now arrays like the other 440.';

const RENAMED = {
    AX: ['Aland Islands', 'Åland Islands', 'the name has an Å'],
    BL: ['Saint Barthelemy', 'Saint Barthélemy', 'the name has an é'],
    CW: ['Curacao', 'Curaçao', 'the name has a ç'],
    RE: ['Reunion', 'Réunion', 'the name has an é'],
    ST: ['Sao Tome and Principe', 'São Tomé and Príncipe', 'the name has its accents'],
    BQ: ['Bonaire, Saint Eustatius and Saba ', 'Bonaire, Sint Eustatius and Saba',
         'the ISO 3166-1 name -- Sint, not Saint -- and a trailing space removed'],
    CC: ['Cocos Islands', 'Cocos (Keeling) Islands', 'the ISO 3166-1 name'],
    PN: ['Pitcairn', 'Pitcairn Islands', 'the name of the territory'],
    PS: ['Palestinian Territory', 'Palestine', 'the common short name; ISO 3166-1 has "Palestine, State of"'],
    TR: ['Turkey', 'Türkiye', 'the UN accepted the change in 2022'],
    SZ: ['Swaziland', 'Eswatini', 'renamed in 2018'],
    MK: ['Macedonia', 'North Macedonia', 'renamed in 2019 by the Prespa agreement'],
    CZ: ['Czech Republic', 'Czechia', 'short name registered with the UN in 2016'],
    CV: ['Cape Verde', 'Cabo Verde', 'ISO and UN form since 2013'],
    CI: ['Ivory Coast', "Côte d'Ivoire", 'the ISO and UN form; the state asks for it untranslated'],
    TL: ['East Timor', 'Timor-Leste', 'the ISO and UN form'],
    VA: ['Vatican', 'Holy See', 'the ISO and UN form'],
};

const renamed = iso2 => {
    const [from, to, why] = RENAMED[iso2];
    return 'name ' + JSON.stringify(from) + ' -> ' + JSON.stringify(to) + ' (' + why +
        '). The former name is an alias, so findByName(' + JSON.stringify(from) +
        ') still answers.';
};

const ENGLISH_ALIAS =
    "ISO 3166-2's English subdivision name added as an alias beside the local " +
    'one, so Bavaria finds Bayern and Florence finds Firenze. Nothing was ' +
    'removed: the ASCII transliterations callers actually type are untouched.';

const currency = (from, to, on, why) =>
    'currency ' + from + ' -> ' + to + ' on ' + on + ' (' + why + ').';

const capital = (from, to, why) =>
    'capital ' + JSON.stringify(from) + ' -> ' + JSON.stringify(to) + ' (' + why + ').';

const CHANGED = {
    BY: 'currency BYR -> BYN.  Belarus redenominated in 2016; master has ' +
        'carried the fix since before v3.1.8, but the v3.1.8 tag was cut off ' +
        'master and published a tree where it had been reverted.',

    // Names spelled the way the place spells them, or the way ISO 3166-1 does.
    AX: renamed('AX'), BL: renamed('BL'), RE: renamed('RE'), PS: renamed('PS'),
    CW: renamed('CW') + '  Also ' +
        capital(' Willemstad', 'Willemstad', 'a leading space') + '  Also ' +
        currency('ANG', 'XCG', '2025-03-31', 'the Caribbean guilder replaced the Netherlands Antillean guilder') +
        '  Also dialing "599" -> "599" with area_codes ["9"]: Curaçao shares +599 with the Caribbean Netherlands.',
    ST: renamed('ST') + '  Also ' + currency('STD', 'STN', '2018-01-01', 'redenomination'),
    BQ: renamed('BQ') + '  Also dialing "599" -> "599" with area_codes ["3", "4", "7"]: ' +
        'the three islands have area codes under the +599 they share with Curaçao.',
    CC: renamed('CC') + '  Also dialing "61" -> "61" with area_codes ["891"]: numbers are +61 8 91xx.',
    PN: renamed('PN') + '  Also dialing "870" -> "64": +870 was the Inmarsat satellite ' +
        'code; the islands are on New Zealand\'s +64.',

    // Capitals that changed in substance, not spelling.
    BI: capital('Bujumbura', 'Gitega', 'political capital since 2019; Bujumbura is the economic capital'),
    CH: capital('Berne', 'Bern', 'the English spelling'),
    EH: capital('El-Aaiun', 'Laayoune', 'the English spelling'),
    GG: capital('St Peter Port', 'Saint Peter Port', 'spelled out'),
    GQ: capital('Malabo', 'Ciudad de la Paz', 'the capital since January 2026'),
    GS: capital('Grytviken', 'King Edward Point', 'Grytviken is an abandoned whaling station; the administration sits at King Edward Point') +
        '  Also dialing "" -> "500": South Georgia is on the Falkland Islands\' +500.',
    IM: capital('Douglas, Isle of Man', 'Douglas', 'the city is Douglas'),
    KI: capital('Tarawa', 'South Tarawa', 'the capital is the South Tarawa council, not the whole atoll'),
    LK: capital('Colombo', 'Sri Jayawardenepura Kotte', 'the official and legislative capital; Colombo is the commercial one'),
    LY: capital('Tripolis', 'Tripoli', 'the English spelling'),
    MM: capital('Nay Pyi Taw', 'Naypyidaw', 'the English spelling'),
    MN: capital('Ulan Bator', 'Ulaanbaatar', 'the English spelling'),
    PW: capital('Melekeok', 'Ngerulmud', 'the capital since 2006; Melekeok is the state it sits in'),
    SG: capital('Singapur', 'Singapore', 'the English spelling'),
    UA: capital('Kiev', 'Kyiv', 'the Ukrainian transliteration'),
    WF: capital('Mata Utu', 'Mata-Utu', 'the hyphen'),

    // The dialing-code model, where it changed more than the format.
    AQ: 'currency XCD -> none: Antarctica has no currency; 3.1.8 said the East ' +
        'Caribbean dollar.  Also dialing "" -> "672" with area_codes ["1"]: the ' +
        'Australian bases are on +672 1x.',
    DO: 'dialing "+1-809 and 1-829" -> "1" with area_codes ["809", "829", "849"]: ' +
        '849 was added in 2013, and the old string never matched any number.',
    JM: 'dialing "+1-876" -> "1" with area_codes ["876", "658"]: 658 overlays 876 since 2018.',
    SX: 'dialing "599" -> "1" with area_codes ["721"]: Sint Maarten joined the ' +
        'North American Numbering Plan on 2011-09-30.  Also ' +
        currency('ANG', 'XCG', '2025-03-31', 'the Caribbean guilder replaced the Netherlands Antillean guilder'),
    XK: 'dialing "" -> "383": assigned by the ITU in 2016.',
    CX: 'dialing "61" -> "61" with area_codes ["891"]: numbers are +61 8 91xx.',
    NF: 'dialing "672" -> "672" with area_codes ["3"]: Norfolk Island shares +672 with the Australian Antarctic Territory.',
    SJ: 'dialing "47" -> "47" with area_codes ["79"]: Svalbard shares +47 with Norway.',
    KZ: 'dialing "7" -> "7" with area_codes ["6", "7"]: Kazakhstan shares +7 with Russia and holds zones 6xx and 7xx.',
    RU: 'dialing "7" -> "7" with area_codes ["3", "4", "8", "9"]: Russia shares +7 with Kazakhstan.',

    // Found by auditing all 31 subdivision lists against ISO 3166-2. Every
    // one of these was a fact that had stopped being true.
    PK: 'subdivisions 31 -> 7. The list was divisions -- a tier abolished in ' +
        '2000 -- and still carried the Federally Administered Tribal Areas, ' +
        'merged into Khyber Pakhtunkhwa in 2018, and the Northern Areas, ' +
        'renamed Gilgit-Baltistan in 2009. Replaced with ISO 3166-2:PK.',
    CU: 'four entries were capital cities, not provinces: Bayamo is the ' +
        'capital of Granma, Santa Clara of Villa Clara, Nueva Gerona of Isla ' +
        'de la Juventud, San Jose de las Lajas of Mayabeque. The cities stay ' +
        'reachable as aliases of the province they administer.',
    ET: STRING_ALIAS + '  Also, regions 11 -> 14. The Southern Nations, Nationalities and Peoples\' ' +
        'Region was dissolved on 2023-08-19; Sidama (2020), South West ' +
        'Ethiopia Peoples (2021), Central Ethiopia and South Ethiopia (both ' +
        '2023) replace it. ISO 3166-2 still lists 12 and knows nothing of the ' +
        'last two, so this follows Ethiopia rather than the standard.',
    ID: 'provinces 34 -> 38. Central Papua, Highland Papua, South Papua and ' +
        'Southwest Papua were created in 2022 and were missing.',
    IN: 'Dadra and Nagar Haveli and Daman and Diu merged into one union ' +
        'territory in 2020 and were still listed separately; Ladakh, created ' +
        'in 2019, was missing.',
    MX: 'Federal District -> Ciudad de México. It stopped being the Federal ' +
        'District when the constitution was amended in 2016. The old name is ' +
        'an alias.',
    ES: 'provinces 46 -> 50. Merged community fixes (PRs #71, #75), and then ' +
        'Cantabria and Navarra, which were missing. Both are ' +
        'single-province autonomous communities, which is how they get ' +
        'overlooked -- issue #27 reported Navarra and Asturias, and only ' +
        'Asturias was ever fixed.',
    IT: 'provinces 106 -> 107. Sud Sardegna was created in 2016 and was ' +
        'missing.  Plus ' + ENGLISH_ALIAS,
    CL: 'provinces 54 -> 56. Ñuble stopped being a province in 2018 when it ' +
        'became a region; it is now Diguillín, Itata and Punilla.',
    PH: 'provinces 82 -> 83. Compostela Valley was renamed Davao de Oro by ' +
        'plebiscite in December 2019, and Maguindanao was divided into ' +
        'Maguindanao del Norte and Maguindanao del Sur on 2022-09-17. Both ' +
        'former names remain aliases. The 83rd entry is Metro Manila, which ' +
        'is a region rather than a province but covers territory no province ' +
        'does.',
    BD: 'Mymensingh Division, created in 2015, was missing, so its four ' +
        'districts were still filed under Dhaka. Barisal and Chittagong ' +
        'divisions carry the spellings they were renamed to in 2018, and the ' +
        'districts renamed at the same time -- Bogra, Comilla, Jessore -- ' +
        'answer to both.',

    // Additive only: ISO 3166-2's English name added alongside the local one.
    BE: ENGLISH_ALIAS, BR: ENGLISH_ALIAS, CN: ENGLISH_ALIAS, DE: ENGLISH_ALIAS,
    NL: ENGLISH_ALIAS,
    GB: 'subdivisions 114 -> 4. The list was historic counties, and four of ' +
        'them -- Avon, Cleveland, Humberside, Middlesex -- have not existed ' +
        'since 1996, 1996, 1996 and 1965. Replaced with what ISO 3166-2:GB ' +
        'actually defines at the first tier: England, Northern Ireland, ' +
        'Scotland and Wales.',
    NG: 'provinces 12 -> 36.  Merged community fix (PR #69).  Also, the ' +
        'Federal Capital Territory was missing entirely.',
    US: 'subdivisions 60 -> 57. The list was USPS postal abbreviations, which ' +
        'include the Federated States of Micronesia, the Marshall Islands and ' +
        'Palau because the postal service serves them. All three are ' +
        'sovereign UN member states in Compacts of Free Association, not US ' +
        'subdivisions, and this dataset carries each as a country in its own ' +
        'right. What remains is ISO 3166-2:US: 50 states, the District of ' +
        'Columbia and 6 outlying areas.  Also ' +
        capital('Washington', 'Washington, D.C.', 'the name of the city'),

    VN: STRING_ALIAS,
    TR: STRING_ALIAS + '  Also ' + renamed('TR'),

    SZ: renamed('SZ'), MK: renamed('MK'), CZ: renamed('CZ'),
    CV: renamed('CV'), CI: renamed('CI'), TL: renamed('TL'), VA: renamed('VA'),

    // ISO 4217 corrections.  Every one is a documented redenomination or euro
    // accession, and the retired code stays resolvable through
    // reference/retired-currencies.json, so findByCurrency('HRK') still
    // answers Croatia rather than turning into undefined.
    HR: currency('HRK', 'EUR', '2023-01-01', 'euro area accession'),
    LT: currency('LTL', 'EUR', '2015-01-01', 'euro area accession'),
    BG: currency('BGN', 'EUR', '2026-01-01', 'euro area accession, issue #84'),
    VE: currency('VEF', 'VED', '2021-10-01', 'two redenominations: VES in 2018, then VED, the bolívar digital'),
    MR: currency('MRO', 'MRU', '2018-01-01', 'redenomination'),
    SL: currency('SLL', 'SLE', '2022-07-01', 'redenomination'),
    ZW: currency('ZWL', 'ZWG', '2024-04-08', 'replaced by Zimbabwe Gold'),
    ZM: currency('ZMK', 'ZMW', '2013-01-01', 'redenomination'),
};

// Individual recorded calls that intentionally differ, keyed as fn(arg).  Use
// this only where the country records themselves are unchanged and it is the
// lookup behaviour that moved.

const CASE_INSENSITIVE =
    'the README has claimed case-insensitive search since 3.1.0 and it was ' +
    'never true.  Exact matching is untouched and still wins; a lowercase ' +
    'fallback runs only after an exact miss, so this turns undefined into a ' +
    'hit and can never change a lookup that already worked.';

const LONGEST_PREFIX =
    '3.1.8 returned every country whose dialing code prefixed the number, so ' +
    '"+1246..." answered [Barbados, UM, US, Canada] -- the caller had to know ' +
    'that the first element was the specific one. It now answers on the most ' +
    'specific prefix only, so "+1246..." is Barbados. Codes genuinely shared ' +
    'at the same length still return every holder, so "+1..." is still three ' +
    'territories.';

const CHANGED_CALLS = {
    'findByIso2("dk")': CASE_INSENSITIVE,
    'findByIso3("dnk")': CASE_INSENSITIVE,
    'findByName("denmark")': CASE_INSENSITIVE,
    'findByCapital("copenhagen")': CASE_INSENSITIVE,
    'findByCurrency("dkk")': CASE_INSENSITIVE,

    'findByPhoneNbr("+12465551212")': LONGEST_PREFIX,
    'findByPhoneNbr("+12125551212")': LONGEST_PREFIX,
    'findByPhoneNbr("+441534123456")': LONGEST_PREFIX,

    'findByCapital("")':
        '3.1.8 answered the six territories that have no capital, because it ' +
        'stored "" for them. A territory with no capital now has none, and an ' +
        'empty query matches nothing.',

    'findByProvince("")':
        '3.1.8 answered [Ethiopia, Turkey, Vietnam] for the empty string. ' +
        'Those three carry a bare-string province alias instead of an array, ' +
        'and "Binh Phuoc".indexOf("") is 0, so every substring matched -- ' +
        'findByProvince("B") answered Vietnam. Aliases are now compared as ' +
        'lists, so an empty query matches nothing.',
};

// The baseline is a JSON snapshot, so a live value is round-tripped the same
// way before comparison.  Undefined results were captured explicitly as
// {u:true} rather than being dropped, so negative cases survive.

const unwrap = o => 'u' in o ? undefined : o.v;
const norm = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
const label = c => c.fn + '(' + c.args.map(a => JSON.stringify(a)).join(', ') + ')';
const asList = v => v === undefined ? [] : Array.isArray(v) ? v : [v];

// 4.0 adds fields to the country record -- borders, timezones, native_name and
// the rest.  The contract is that every field 3.1.8 returned still holds the
// same value, not that no field was ever added, so comparisons are narrowed to
// the keys the baseline actually has.  The new keys get pinned separately, by
// name, below.

function restrict(actual, expected) {
    if (Array.isArray(expected))
        return Array.isArray(actual) ? actual.map((v, i) => restrict(v, expected[i])) : actual;
    if (expected && typeof expected == 'object' && actual && typeof actual == 'object') {
        const out = {};
        for (const k of Object.keys(expected)) out[k] = restrict(actual[k], expected[k]);
        // the area codes were part of the dialing code string in 3.1.8, so
        // they are compared wherever the dialing code is
        if ('dialing_code' in expected && actual.area_codes !== undefined)
            out.area_codes = actual.area_codes;
        return out;
    }
    return actual;
}

// A recorded call still honours the contract if every country it returns is
// byte-identical to 3.1.8, except for countries declared in CHANGED.  Stating
// it that way rather than listing affected calls means a declared data change
// does not need a second declaration everywhere it happens to surface --
// findByCurrency('EUR') picks up Spain, findByProvince('Ondo') picks up
// Nigeria -- while an undeclared change anywhere still fails.

function compare(name, actual, expected) {
    const wanted = new Map(asList(normalise(norm(expected))).map(o => [o.code.iso2, o]));
    const a = new Map(asList(normalise(norm(actual)))
        .map(o => [o.code.iso2, JSON.stringify(restrict(o, wanted.get(o.code.iso2) || o))]));
    const e = new Map([...wanted].map(([k, o]) => [k, JSON.stringify(o)]));

    const offenders = [...new Set([...a.keys(), ...e.keys()])]
        .filter(k => a.get(k) !== e.get(k) && !(k in CHANGED)).sort();
    assert.deepStrictEqual(offenders, [],
        name + ' differs from 3.1.8 for undeclared countries: ' + offenders.join(', '));

    // The set of matched countries is unchanged, so the shape of the result
    // must be too.  Its order is no longer 3.1.8's: a result comes back in the
    // same name order as names() and ls(), rather than in the insertion order
    // of the file 3.1.8 kept its countries in.
    if ([...a.keys()].sort().join() === [...e.keys()].sort().join()) {
        expect(Array.isArray(actual), name + ' array-ness')
            .to.equal(Array.isArray(expected));
        expect(actual === undefined, name + ' undefined-ness')
            .to.equal(expected === undefined);

        const names = asList(actual).map(c => c.name);
        expect(names, name + ' is not in name order')
            .to.deep.equal([...names].sort((x, y) => x.localeCompare(y, 'en')));
    }
}

describe('Contract: module surface', () => {
    it('exports every 3.1.8 member except the ones declared removed', () => {
        expect(Object.keys(country).sort())
            .to.deep.equal(base.members.filter(m => !(m in REMOVED_MEMBERS)));
    });

    it('really did remove the members declared removed', () => {
        for (const m of Object.keys(REMOVED_MEMBERS)) {
            expect(base.members, m + ' was never in 3.1.8').to.include(m);
            expect(country, m).to.not.have.property(m);
        }
    });

    it('every member it kept is of the type it was in 3.1.8', () => {
        for (const m of base.members) {
            if (m in REMOVED_MEMBERS) continue;
            expect(typeof country[m], m).to.equal(m === 'all' ? 'object' : 'function');
        }
    });

    it('still carries exactly 250 countries, with the same ISO-2 keys', () => {
        expect(Object.keys(country.all)).to.have.lengthOf(250);
        expect(Object.keys(country.all).sort())
            .to.deep.equal(Object.keys(base.countries).sort());
    });
});

describe('Contract: country records', () => {
    const live = iso2 => JSON.stringify(normalise(restrict(
        norm(country.findByIso2(iso2)), base.countries[iso2])));
    const was = iso2 => JSON.stringify(normalise(norm(base.countries[iso2])));

    it('every country matches 3.1.8 except the declared changes', () => {
        const undeclared = Object.keys(base.countries)
            .filter(iso2 => !(iso2 in CHANGED) && was(iso2) !== live(iso2));
        assert.deepStrictEqual(undeclared, [],
            'undeclared differences from 3.1.8: ' + undeclared.join(', '));
    });

    it('the declared changes really did change (the list is not stale)', () => {
        for (const iso2 of Object.keys(CHANGED))
            expect(was(iso2), iso2 + ' is declared as changed but is identical to 3.1.8')
                .to.not.equal(live(iso2));
    });

    it('still carries every key 3.1.8 carried, on every country', () => {
        const KEYS = ['capital', 'code', 'continent', 'currency',
                      'dialing_code', 'name', 'provinces', 'region'];
        for (const iso2 of Object.keys(base.countries))
            expect(Object.keys(country.findByIso2(iso2)), iso2)
                .to.include.members(KEYS);
    });

    it('carries exactly this key set -- no more, no fewer', () => {
        // stated by name rather than counted, so that adding or dropping a
        // field is a deliberate edit to this list
        const KEYS = ['area_codes', 'borders', 'capital', 'code', 'continent',
                      'currency', 'demonym', 'dialing_code', 'languages',
                      'latlng', 'name', 'native_name', 'provinces', 'region',
                      'timezones', 'tld'];
        for (const iso2 of Object.keys(country.all))
            expect(Object.keys(country.findByIso2(iso2)).sort(), iso2)
                .to.deep.equal(KEYS);
    });

    it('keeps code as {iso2, iso3} and adds numeric alongside', () => {
        for (const iso2 of Object.keys(base.countries)) {
            const code = country.findByIso2(iso2).code;
            expect(code.iso2, iso2).to.equal(base.countries[iso2].code.iso2);
            expect(code.iso3, iso2).to.equal(base.countries[iso2].code.iso3);
            expect(Object.keys(code).sort(), iso2)
                .to.deep.equal(['iso2', 'iso3', 'numeric']);
        }
    });

    it('carries `provinces` as a present-but-undefined key when there are none', () => {
        // 3.1.8 does this, and `'provinces' in country` is observable, so it
        // is part of the contract even though JSON.stringify hides it
        const without = Object.keys(country.all)
            .filter(k => country.findByIso2(k).provinces === undefined);
        expect(without).to.have.lengthOf(219);
        for (const iso2 of without)
            expect('provinces' in country.findByIso2(iso2), iso2).to.equal(true);
    });

    it('keeps currency as {code, symbol, decimal}, decimal now a number', () => {
        for (const iso2 of Object.keys(base.countries)) {
            const c = country.findByIso2(iso2).currency;
            if (iso2 === 'AQ') { expect(c, 'Antarctica has no currency').to.equal(undefined); continue; }
            expect(Object.keys(c).sort(), iso2).to.deep.equal(['code', 'decimal', 'symbol']);
            expect(c.decimal, iso2 + '.currency.decimal').to.be.a('number');
            expect(c.code, iso2 + '.currency.code').to.be.a('string');
        }
    });

    it('keeps dialing_code a string of digits, or undefined where there is no telephone service', () => {
        for (const iso2 of Object.keys(base.countries)) {
            const c = country.findByIso2(iso2);
            expect(c.dialing_code, iso2).to.satisfy(v => v === undefined || /^[1-9][0-9]{0,2}$/.test(v));
            expect(c.area_codes, iso2).to.satisfy(v => v === undefined || (Array.isArray(v) && v.length && c.dialing_code));
        }
        expect(Object.keys(base.countries).filter(k => country.findByIso2(k).dialing_code === undefined))
            .to.deep.equal(['BV', 'HM', 'TF']);
    });

    it('returns a fresh object each call, so callers cannot corrupt the store', () => {
        const a = country.findByIso2('DK');
        a.name = 'MUTATED';
        expect(country.findByIso2('DK').name).to.equal('Denmark');
    });
});

// Every list a caller can observe is now ordered by country name.  3.1.8's
// order was the insertion order of a hand-maintained file, which meant a new
// country went on the end and nothing about the sequence was stated anywhere.

describe('Contract: list functions', () => {
    const bag = a => [...a].sort();
    const renames = new Map(Object.values(RENAMED).map(([from, to]) => [from, to]));
    const rename = n => renames.get(n) || n;

    it('names() holds the same countries, renames aside', () => {
        expect(bag(country.names())).to.deep.equal(bag(base.names.map(rename)));
    });

    it('names() is ordered by name, which 3.1.8 never was', () => {
        const n = country.names();
        expect(n).to.deep.equal([...n].sort((a, b) => a.localeCompare(b, 'en')));
        expect(n).to.not.deep.equal(base.names);
    });

    it('continents() holds the same values as 3.1.8', () => {
        expect(bag(country.continents())).to.deep.equal(bag(base.continents));
    });

    it('capitals() holds the same values as 3.1.8, folded, outside the declared changes', () => {
        const cap = c => c.capital ? fold(c.capital) : undefined;
        const keep = iso2 => !(iso2 in CHANGED);
        const was = Object.keys(base.countries).filter(keep).map(k => cap(base.countries[k]));
        const now = Object.keys(base.countries).filter(keep).map(k => cap(country.findByIso2(k)));
        expect(bag(now.filter(Boolean))).to.deep.equal(bag(was.filter(Boolean)));
        expect(now.filter(c => c === undefined)).to.have.lengthOf(was.filter(c => c === undefined).length);
    });

    it('every list is in the same order as names()', () => {
        const order = country.ls('name');
        expect(country.names()).to.deep.equal(order);
        expect(country.capitals()).to.have.lengthOf(order.length);
    });

    it("ls('region') is the M49 scheme, not 3.1.8's free text", () => {
        expect(bag(country.ls('region'))).to.not.deep.equal(bag(base.regions));
        expect(new Set(country.ls('region')).size).to.equal(23);
    });

    it("ls('iso3') holds the same codes as 3.1.8", () => {
        expect(bag(country.ls('iso3'))).to.deep.equal(bag(base.iso3s));
    });

    it('ls() on an unknown field returns 250 undefineds rather than throwing', () => {
        const r = country.ls('no_such_field');
        expect(r).to.have.lengthOf(250);
        expect(r.every(v => v === undefined)).to.equal(true);
    });

    it('continents() returns the 7 continents, deduplicated', () => {
        expect(country.continents()).to.have.lengthOf(7);
        expect(new Set(country.continents()).size).to.equal(7);
    });
});

describe('Contract: recorded calls reproduce 3.1.8', () => {
    for (const c of base.calls)
        it(label(c), () => {
            const name = label(c);
            const actual = country[c.fn](...c.args);
            const expected = unwrap(c.out);

            if (name in CHANGED_CALLS)
                return expect(JSON.stringify(norm(actual)),
                    name + ' is declared as changed but is identical to 3.1.8')
                    .to.not.equal(JSON.stringify(norm(expected)));

            compare(name, actual, expected);
        });

    it('every declared call change is actually in the baseline', () => {
        for (const name of Object.keys(CHANGED_CALLS))
            expect(base.calls.map(label), name + ' is declared but not recorded')
                .to.include(name);
    });
});

describe('Contract: Array.prototype is left alone', () => {
    it('no longer installs unpack() and unique()', () => {
        // 3.1.8 patched Array.prototype for every application that required
        // it. Removing that is the point, not a side effect.
        for (const p of ['unpack', 'unique'])
            expect(Object.getOwnPropertyDescriptor(Array.prototype, p), p)
                .to.equal(undefined);
    });

    it('does not leak into for..in over arrays', () => {
        const seen = [];
        for (const k in [10, 20]) seen.push(k);
        expect(seen).to.not.include('unpack');
        expect(seen).to.not.include('unique');
    });

    it('adds nothing enumerable to Array.prototype', () => {
        expect(Object.keys(Array.prototype)).to.deep.equal([]);
    });

    it('does not leak into JSON.stringify or object spread', () => {
        expect(JSON.stringify([1, 2])).to.equal('[1,2]');
        expect(Object.assign({}, [1, 2])).to.deep.equal({0: 1, 1: 2});
    });
});
