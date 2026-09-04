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

type Field = 'iso2' | 'iso3' | 'name' | 'capital' | 'currency';
const FIELDS: Field[] = ['iso2', 'iso3', 'name', 'capital', 'currency'];

type Table = Record<string, CountryRecord[]>;

// Lookup tables have no prototype, so a query of "constructor" or "toString"
// reads as a miss rather than as Object.prototype's own property.
const table = (): Table => Object.create(null);

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
        currency: r.currency === undefined ? undefined : {
            code: r.currency,
            symbol: r.currency_symbol as string,
            decimal: r.currency_decimal as number,
        },
        dialing_code: r.dialing_code,
        area_codes: r.area_codes,
        provinces: r.provinces,
        code: {iso2: r.iso2, iso3: r.iso3, numeric: r.iso_numeric},
        native_name: r.native_name,
        demonym: r.demonym,
        languages: r.languages,
        tld: r.tld,
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

// Case and Latin diacritics are folded away for the fallback match, so that
// 'bogota' finds Bogotá and 'sao tome' finds São Tomé.  Only the combining
// marks of the Latin, Greek and Cyrillic scripts are stripped; the vowel signs
// of Indic and Arabic scripts are letters in their own right and stay.

function fold(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u02bb\u2018\u2019]/g, "'").toLowerCase();
}

// Exact match first, always: an alias or a fold can only turn a lookup that
// answered undefined into a hit, never change one that already worked.

function resolve(field: Field, value: unknown): CountryRecord[] | undefined {
    if (typeof value !== 'string') return undefined;

    const exact = index[field][value];
    if (exact) return exact;

    if (field === 'name') {
        const owner = aliases().exact[value];
        if (owner) return [all[owner]];
    }

    const key = fold(value);
    const loose = folded()[field][key];
    if (loose) return loose;

    if (field === 'name') {
        const owner = aliases().folded[key];
        if (owner) return [all[owner]];
    }
    return undefined;
}

// Everything below the exact match is built on first use.  An exact hit is the
// common case, and folding 250 records five times over -- plus parsing and
// indexing the alias table -- is work most callers never need.

let foldedMaps: Record<Field, Table> | null = null;

function folded(): Record<Field, Table> {
    if (foldedMaps) return foldedMaps;
    const maps = foldedMaps = {
        iso2: table(), iso3: table(), name: table(), capital: table(), currency: table(),
    };

    for (const r of records)
        for (const f of FIELDS) {
            const v = r[f];
            if (v === undefined) continue;
            const k = fold(v);
            (maps[f][k] || (maps[f][k] = [])).push(r);
        }

    // a retired code has to be reachable case-insensitively too
    for (const code of Object.keys(retiredCurrencies))
        maps.currency[fold(code)] ||= retiredCurrencies[code].countries.map(c => all[c]);

    return maps;
}

let aliasMaps: {exact: Record<string, Iso2>; folded: Record<string, Iso2>} | null = null;

function aliases() {
    if (aliasMaps) return aliasMaps;
    const exact: Record<string, Iso2> = Object.assign(
        Object.create(null), require('./data/name-aliases.json'));
    const loose: Record<string, Iso2> = Object.create(null);
    for (const a of Object.keys(exact)) loose[fold(a)] = exact[a];
    return (aliasMaps = {exact, folded: loose});
}

// -- indexes -----------------------------------------------------------------

const index: Record<Field, Table> = {
    iso2: table(), iso3: table(), name: table(), capital: table(), currency: table(),
};
const byPrefix: Table = table();
let prefixLengths: number[] = [];

(function build() {
    const lengths: Record<number, true> = {};

    for (const r of records) {
        // the key has to exist and read as undefined rather than be absent:
        // `'provinces' in country` is true for all 250, and undefined for the
        // countries that have none
        r.provinces = provincesByCode[r.iso2];
        all[r.iso2] = r;

        for (const f of FIELDS) {
            const v = r[f];
            if (v === undefined) continue;
            (index[f][v] || (index[f][v] = [])).push(r);
        }

        if (r.dialing_code === undefined) continue;

        // a territory with area codes is reachable only through them: Antigua
        // is +1 268, and the bare +1 stays with the countries that hold the
        // whole code
        const prefixes = r.area_codes
            ? r.area_codes.map(a => r.dialing_code + a)
            : [r.dialing_code];
        for (const p of prefixes) {
            (byPrefix[p] || (byPrefix[p] = [])).push(r);
            lengths[p.length] = true;
        }
    }

    // longest prefix first, so +1 246 finds Barbados before the +1 block
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

let provinceMaps: {exact: Map<string, CountryRecord[]>; folded: Map<string, CountryRecord[]>} | null = null;

function provinces() {
    if (provinceMaps) return provinceMaps;
    const exact = new Map<string, CountryRecord[]>();
    const loose = new Map<string, CountryRecord[]>();

    const add = (map: Map<string, CountryRecord[]>, key: string, r: CountryRecord) => {
        const list = map.get(key);
        if (!list) map.set(key, [r]);
        else if (!list.includes(r)) list.push(r);
    };

    for (const r of records)
        for (const p of r.provinces || [])
            for (const name of [p.name, ...(p.alias || [])]) {
                add(exact, name, r);
                add(loose, fold(name), r);
            }

    return (provinceMaps = {exact, folded: loose});
}

// -- the module --------------------------------------------------------------

const country = {
    /** Every country, keyed by ISO 3166-1 alpha-2 code. */
    all,

    /** Find by ISO 3166-1 alpha-2 code. Unique, so one country or none. */
    findByIso2: (code: string): Country | undefined => one(resolve('iso2', code)),

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
    findByProvince(name: string): Country[] {
        if (typeof name !== 'string') return [];
        const maps = provinces();
        return many(maps.exact.get(name) || maps.folded.get(fold(name)));
    },

    /**
     * Find by telephone number, on the most specific dialing code that prefixes
     * it: `'+1246...'` is Barbados, not the whole `+1` block. Codes genuinely
     * shared at the same length still return every country holding them, so
     * `'+1 212...'` answers Canada, the United States and the U.S. Minor
     * Outlying Islands together.
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

    /** Every capital, in name order; undefined for the territories that have none. */
    capitals(): (string | undefined)[] {
        return country.ls('capital');
    },
};

export default country;
