/**
 * Country data: ISO codes, names, capitals, currencies, dialing codes,
 * subdivisions, borders and time zones for 250 countries and territories.
 */

import type {
    Country, CountryCode, CountryRecord, Currency, Iso2, Iso3,
    Province, CurrencyCode, ContinentName,
} from './types';

export type {
    Country, CountryCode, CountryRecord, Currency, Iso2, Iso3,
    Province, CurrencyCode, ContinentName,
};

// The data files are loaded rather than inlined so that the copy in data/ is
// the only copy.  These specifiers are marked external at build time and
// survive verbatim into the emitted index.js, which sits beside data/.

declare function require(path: string): any;

const records: CountryRecord[] = require('./data/countries.json');
const provincesByCode: Record<string, Province[]> = require('./data/provinces.json');
const retiredCurrencies: Record<string, {successor: string; countries: Iso2[]; retired: string}> =
    require('./data/retired-currencies.json');

type Field = 'iso3' | 'name' | 'capital' | 'currency';

const all = {} as Record<string, CountryRecord>;

// -- the public country shape ------------------------------------------------

// Callers see currency and the ISO codes grouped; the stored record keeps them
// flat, because that is the shape the data files hold.  A fresh object is built
// on every lookup, so a caller who writes to a result cannot affect any other.

function transform(r: CountryRecord | undefined): Country | undefined {
    if (!r) return undefined;
    return {
        name: r.name,
        continent: r.continent,
        region: r.region,
        capital: r.capital,
        currency: {
            code: r.currency,
            symbol: r.currency_symbol,
            decimal: r.currency_decimal,
        },
        dialing_code: r.dialing_code,
        provinces: r.provinces,
        code: {iso2: r.iso2, iso3: r.iso3, numeric: r.iso_numeric},
        native_name: r.native_name,
        demonym: r.demonym,
        languages: r.languages,
        tld: r.tld,
        area: r.area,
        latlng: r.latlng,
        timezones: r.timezones,
        borders: r.borders,
    };
}

// A lookup on a field the data guarantees unique answers the country or
// undefined; one that can match several always answers a list, empty when
// nothing matched. Neither ever hands back a shape the caller has to test for.

function one(list: CountryRecord[] | undefined): Country | undefined {
    return list && list.length ? transform(list[0]) : undefined;
}

function many(list: CountryRecord[] | undefined): Country[] {
    return list ? (list.map(transform) as Country[]) : [];
}

// Exact match first, always: an alias or a case fold can only turn a lookup
// that answered undefined into a hit, never change one that already worked.

function resolve(field: Field, value: unknown): CountryRecord[] | undefined {
    const exact = index[field][value as string];
    if (exact) return exact;
    if (typeof value !== 'string') return undefined;

    if (field === 'name') {
        const owner = aliases().exact[value];
        if (owner) return [all[owner]];
    }

    const key = value.toLowerCase();
    const insensitive = lowercase()[field][key];
    if (insensitive) return insensitive;

    if (field === 'name') {
        const owner = aliases().lower[key];
        if (owner) return [all[owner]];
    }
    return undefined;
}

// Everything below the exact match is built on first use.  An exact hit is the
// common case, and lowercasing 250 records five times over -- plus parsing and
// indexing the alias table -- is work most callers never need.

let lowerMaps: Record<Field | 'iso2', Record<string, CountryRecord[]>> | null = null;

function lowercase() {
    if (lowerMaps) return lowerMaps;
    const maps = lowerMaps =
        {iso2: {}, iso3: {}, name: {}, capital: {}, currency: {}} as
        Record<Field | 'iso2', Record<string, CountryRecord[]>>;

    for (const r of records)
        for (const f of ['iso2', 'iso3', 'name', 'capital', 'currency'] as (Field | 'iso2')[]) {
            const k = String(r[f]).toLowerCase();
            (maps[f][k] || (maps[f][k] = [])).push(r);
        }

    // a retired code has to be reachable case-insensitively too
    for (const code of Object.keys(retiredCurrencies))
        maps.currency[code.toLowerCase()] ||= retiredCurrencies[code].countries.map(c => all[c]);

    return maps;
}

let aliasMaps: {exact: Record<string, Iso2>; lower: Record<string, Iso2>} | null = null;

function aliases() {
    if (aliasMaps) return aliasMaps;
    const exact: Record<string, Iso2> = require('./data/name-aliases.json');
    const lower: Record<string, Iso2> = {};
    for (const a of Object.keys(exact)) lower[a.toLowerCase()] = exact[a];
    return (aliasMaps = {exact, lower});
}

// -- indexes -----------------------------------------------------------------

const index: Record<Field, Record<string, CountryRecord[]>> =
    {iso3: {}, name: {}, capital: {}, currency: {}};
const byPrefix: Record<string, CountryRecord[]> = {};
let prefixLengths: number[] = [];

(function build() {
    const lengths: Record<number, true> = {};

    for (const r of records) {
        // the key has to exist and read as undefined rather than be absent:
        // `'provinces' in country` is true for all 250, and undefined for the
        // countries that have none
        r.provinces = provincesByCode[r.iso2];
        all[r.iso2] = r;

        for (const f of ['iso3', 'name', 'capital', 'currency'] as Field[]) {
            const v = r[f] as string;
            (index[f][v] || (index[f][v] = [])).push(r);
        }

        const prefix = r.dialing_code.replace(/\D/g, '');
        if (!prefix) continue;

        (byPrefix[prefix] || (byPrefix[prefix] = [])).push(r);
        lengths[prefix.length] = true;
    }

    // longest prefix first, so +1-246 finds Barbados before the +1 block
    prefixLengths = Object.keys(lengths).map(Number).sort((a, b) => b - a);

    // Codes ISO 4217 has retired resolve to the countries that used them, so
    // correcting the data does not silently turn a working findByCurrency call
    // into undefined.  Folding them into the index rather than branching at
    // lookup time keeps the hot path a single hash read.  An active code always
    // wins: none currently collide, and this makes sure of it.
    for (const code of Object.keys(retiredCurrencies))
        if (!index.currency[code])
            index.currency[code] = retiredCurrencies[code].countries.map(c => all[c]);
})();

// Province lookup is built on the first call rather than at load: it walks
// every subdivision and its aliases, and most callers never ask.

let provinceMap: Map<string, CountryRecord[]> | null = null;

function provinceIndex(): Map<string, CountryRecord[]> {
    if (provinceMap) return provinceMap;
    const map = provinceMap = new Map<string, CountryRecord[]>();

    const add = (key: string, r: CountryRecord) => {
        const list = map.get(key);
        if (!list) map.set(key, [r]);
        else if (list[list.length - 1] !== r) list.push(r);
    };

    for (const r of records)
        for (const p of r.provinces || []) {
            add(p.name, r);
            for (const a of p.alias || []) add(a, r);
        }

    return map;
}

// -- the module --------------------------------------------------------------

const country = {
    /** Every country, keyed by ISO 3166-1 alpha-2 code. */
    all,

    /** Find by ISO 3166-1 alpha-2 code. Falls back to a case-insensitive match. */
    findByIso2(code: string): Country | undefined {
        const r = all[code];
        if (r) return transform(r);
        if (typeof code !== 'string') return undefined;
        const hit = lowercase().iso2[code.toLowerCase()];
        return hit && transform(hit[0]);
    },

    /** Find by ISO 3166-1 alpha-3 code. Unique, so one country or none. */
    findByIso3: (code: string): Country | undefined => one(resolve('iso3', code)),

    /**
     * Find by name. Unique, so one country or none. Accepts native forms,
     * official long forms and former names.
     */
    findByName: (name: string): Country | undefined => one(resolve('name', name)),

    /**
     * Find by capital city. A list: Kingston is both Jamaica and Norfolk
     * Island, and six territories have no capital at all.
     */
    findByCapital: (name: string): Country[] => many(resolve('capital', name)),

    /**
     * Find by ISO 4217 code. A list: most currencies are used by more than one
     * country. Retired codes still resolve to the countries that used them.
     */
    findByCurrency: (code: string): Country[] => many(resolve('currency', code)),

    /** Find by subdivision, by name or by alias. */
    findByProvince: (name: string): Country[] => many(provinceIndex().get(name)),

    /**
     * Find by telephone number, on the most specific dialing code that prefixes
     * it: `'+1246...'` is Barbados, not the whole `+1` block. Codes genuinely
     * shared at the same length still return every country holding them, so
     * `'+1...'` answers Canada, the United States and the U.S. Minor Outlying
     * Islands together.
     */
    findByPhoneNbr(nbr: string): Country[] {
        if (typeof nbr !== 'string') return [];

        const digits = nbr.replace(/\D/g, '');
        if (!digits) return [];

        // one hash read per distinct prefix length, longest first, rather than
        // testing the number against every prefix in the table
        for (const len of prefixLengths) {
            const found = byPrefix[digits.slice(0, len)];
            if (found) return many(found);
        }
        return [];
    },

    /** List one field across every country, in name order. */
    ls<K extends keyof CountryRecord>(field: K): CountryRecord[K][] {
        return records.map(r => r[field]);
    },

    /** The seven continents. */
    continents(): ContinentName[] {
        const seen = country.ls('continent');
        return seen.filter((c, i) => seen.indexOf(c) === i);
    },

    /** Every country name, in name order. */
    names(): string[] {
        return country.ls('name');
    },

    /** Every capital, in name order. */
    capitals(): string[] {
        return country.ls('capital');
    },
};

export default country;
