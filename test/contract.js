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

const BREAKING = [{
    what: 'currency.decimal is a number, not a string',
    why: 'it counts minor units. 3.1.8 returned the string "2"; code that ' +
         'compares it against "2" now fails quietly, which is why this is ' +
         'called out in the changelog and not only here.',
    migrate: c => { c.currency.decimal = Number(c.currency.decimal); },
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

(function migrate(v) {
    if (Array.isArray(v)) return v.forEach(migrate);
    if (!v || typeof v !== 'object') return;
    if (v.currency && typeof v.currency === 'object')
        for (const b of BREAKING) b.migrate(v);
    Object.values(v).forEach(migrate);
})(base);

// Country records that intentionally differ from published 3.1.8.

const STRING_ALIAS =
    'one province alias was a bare string rather than an array (ET/SNNPR, ' +
    'TR/Mugla, VN/Binh Phuoc).  String indexOf is a substring search, so ' +
    'findByProvince("B") answered Vietnam and the empty string matched all ' +
    'three.  The three are now arrays like the other 440.';

const RENAMED = {
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

const currency = (from, to, on, why) =>
    'currency ' + from + ' -> ' + to + ' on ' + on + ' (' + why + ').';

const CHANGED = {
    BY: 'currency BYR -> BYN.  Belarus redenominated in 2016; master has ' +
        'carried the fix since before v3.1.8, but the v3.1.8 tag was cut off ' +
        'master and published a tree where it had been reverted.',
    ES: 'provinces 46 -> 48.  Merged community fixes (PRs #71, #75).',
    GB: 'subdivisions 114 -> 4. The list was historic counties, and four of ' +
        'them -- Avon, Cleveland, Humberside, Middlesex -- have not existed ' +
        'since 1996, 1996, 1996 and 1965. Replaced with what ISO 3166-2:GB ' +
        'actually defines at the first tier: England, Northern Ireland, ' +
        'Scotland and Wales.',
    NG: 'provinces 12 -> 36.  Merged community fix (PR #69).',
    US: 'subdivisions 60 -> 57. The list was USPS postal abbreviations, which ' +
        'include the Federated States of Micronesia, the Marshall Islands and ' +
        'Palau because the postal service serves them. All three are ' +
        'sovereign UN member states in Compacts of Free Association, not US ' +
        'subdivisions, and this dataset carries each as a country in its own ' +
        'right. What remains is ISO 3166-2:US: 50 states, the District of ' +
        'Columbia and 6 outlying areas.',

    ET: STRING_ALIAS, VN: STRING_ALIAS,
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
    VE: currency('VEF', 'VES', '2018-08-20', 'redenomination'),
    MR: currency('MRO', 'MRU', '2018-01-01', 'redenomination'),
    ST: currency('STD', 'STN', '2018-01-01', 'redenomination'),
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
    const wanted = new Map(asList(norm(expected)).map(o => [o.code.iso2, o]));
    const a = new Map(asList(norm(actual))
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
    it('every country matches 3.1.8 except the declared changes', () => {
        const undeclared = Object.keys(base.countries).filter(iso2 =>
            !(iso2 in CHANGED) &&
            JSON.stringify(base.countries[iso2]) !==
            JSON.stringify(restrict(country.findByIso2(iso2), base.countries[iso2])));
        assert.deepStrictEqual(undeclared, [],
            'undeclared differences from 3.1.8: ' + undeclared.join(', '));
    });

    it('the declared changes really did change (the list is not stale)', () => {
        for (const iso2 of Object.keys(CHANGED))
            expect(JSON.stringify(base.countries[iso2]),
                iso2 + ' is declared as changed but is identical to 3.1.8')
                .to.not.equal(JSON.stringify(
                    restrict(country.findByIso2(iso2), base.countries[iso2])));
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
        const KEYS = ['area', 'borders', 'capital', 'code', 'continent',
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
            expect(Object.keys(c).sort(), iso2).to.deep.equal(['code', 'decimal', 'symbol']);
            expect(c.decimal, iso2 + '.currency.decimal').to.be.a('number');
            expect(c.code, iso2 + '.currency.code').to.be.a('string');
        }
    });

    it('keeps dialing_code a string', () => {
        for (const iso2 of Object.keys(base.countries))
            expect(country.findByIso2(iso2).dialing_code, iso2).to.be.a('string');
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

    for (const [fn, key] of [['capitals', 'capitals'], ['continents', 'continents']])
        it(fn + '() holds the same values as 3.1.8', () => {
            expect(bag(country[fn]())).to.deep.equal(bag(base[key]));
        });

    it('every list is in the same order as names()', () => {
        const order = country.ls('name');
        expect(country.names()).to.deep.equal(order);
        expect(country.capitals()).to.have.lengthOf(order.length);
    });

    it("ls('region') holds the same values as 3.1.8", () => {
        expect(bag(country.ls('region'))).to.deep.equal(bag(base.regions));
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
