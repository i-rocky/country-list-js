/**
 * Country data: ISO codes, names, capitals, currencies, dialing codes,
 * provinces, borders and time zones.
 *
 * The public surface is deliberately identical to 3.1.8. Anything added is
 * additive; nothing that worked before returns something different.
 */

import type {
    Country, CountryCode, CountryRecord, Currency, Found, Iso2, Iso3,
    PhoneOptions, Province, CurrencyCode, ContinentName,
} from './types';

export type {
    Country, CountryCode, CountryRecord, Currency, Found, Iso2, Iso3,
    PhoneOptions, Province, CurrencyCode, ContinentName,
};

// The data files stay separate rather than being inlined, so that the copy in
// data/ is the only copy and callers who deep-import
// `country-list-js/data/names.json` read the same bytes the runtime does.
// These specifiers are marked external at build time and survive verbatim into
// the emitted index.js, which sits beside data/.

declare function require(path: string): any;

const records: CountryRecord[] = require('./data/countries.json');
const provincesByCode: Record<string, Province[]> = require('./data/provinces.json');
const retiredCurrencies: Record<string, {successor: string; countries: Iso2[]; retired: string}> =
    require('./data/retired-currencies.json');

type Field = 'iso3' | 'name' | 'capital' | 'currency';

const all = {} as Record<string, CountryRecord>;
const cache = {} as Record<string, Record<string, Found>>;

// -- the public country shape ------------------------------------------------

// callers see currency and the ISO codes grouped; the stored record keeps them
// flat because that is the shape the data files hold

function transform(r: CountryRecord | undefined): Country | undefined {
    if (!r) return undefined;
    return {
        // the eight fields 3.1.8 returned, in the order it returned them
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

        // added in 4.0.  Always present, undefined where unknown, so every
        // country has the same shape
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

// no match is undefined, one match is the country itself, several are an
// array -- the shape callers have always seen

function pack(list: CountryRecord[] | undefined): Found {
    if (!list || !list.length) return undefined;
    return list.length === 1
        ? transform(list[0])
        : (list.map(transform) as Country[]);
}

// Cached results are rebuilt on the way out.  3.1.8 handed back the very
// object it had cached, so a caller who wrote to a result poisoned the cache
// for the whole process: after `findByName('Denmark').name = 'x'`, every later
// lookup of Denmark answered 'x'.

function copy(found: Found): Found {
    if (!found) return undefined;
    return Array.isArray(found) ? found.map(clone) : clone(found);
}

function clone(c: Country): Country {
    return {
        name: c.name,
        continent: c.continent,
        region: c.region,
        capital: c.capital,
        currency: {code: c.currency.code, symbol: c.currency.symbol, decimal: c.currency.decimal},
        dialing_code: c.dialing_code,
        provinces: c.provinces,
        code: {iso2: c.code.iso2, iso3: c.code.iso3, numeric: c.code.numeric},

        native_name: c.native_name,
        demonym: c.demonym,
        languages: c.languages,
        tld: c.tld,
        area: c.area,
        latlng: c.latlng,
        timezones: c.timezones,
        borders: c.borders,
    };
}

function find(field: Field, value: unknown): Found {
    const key = String(value);
    if (!(field in cache)) cache[field] = {};
    if (key in cache[field]) return copy(cache[field][key]);

    const hit = pack(resolve(field, value));

    // Only hits are cached.  3.1.8 cached misses too, so a caller feeding user
    // input to findByName grew the cache by one key per distinct typo, with
    // nothing to evict it.  Lookups are index reads now, so the cache buys no
    // speed -- it is kept because it is observable, not because it is needed.
    if (hit) cache[field][key] = hit;
    return copy(hit);
}

// Exact match first, always.  Everything after it only ever turns a lookup
// that used to answer undefined into a hit; no query that works today can
// start answering something else.

function resolve(field: Field, value: unknown): CountryRecord[] | undefined {
    const exact = index[field][value as string];
    if (exact) return exact;
    if (typeof value !== 'string') return undefined;

    if (field === 'name') {
        const owner = aliases().exact[value];
        if (owner) return [all[owner]];
    }

    // the README has claimed case-insensitive search since 3.1.0 and it has
    // never been true: findByName('denmark') answered undefined
    const key = value.toLowerCase();
    const insensitive = lowercase()[field][key];
    if (insensitive) return insensitive;

    if (field === 'name') {
        const owner = aliases().lower[key];
        if (owner) return [all[owner]];
    }
    return undefined;
}

// Everything below the exact match is built on first use.  An exact hit is by
// far the common case, and paying to lowercase 250 records five times over --
// plus parsing and indexing 682 aliases -- on every require() is most of what
// separates this from 3.1.8's load time.

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
        // the key has to exist and be undefined rather than be absent:
        // `'provinces' in country` is true for all 250, and reads as
        // undefined for the 219 that have none
        r.provinces = provincesByCode[r.iso2];
        all[r.iso2] = r;

        for (const f of ['iso3', 'name', 'capital', 'currency'] as Field[]) {
            const v = r[f] as string;
            (index[f][v] || (index[f][v] = [])).push(r);
        }

        const prefix = r.dialing_code.replace(/\D/g, '');
        if (!prefix) continue;

        // unshift, not push.  3.1.8 ordered its prefix table with
        // `(a, b) => a.nbr.length < b.nbr.length ? 1 : -1`, which answers -1
        // for equal lengths -- an inconsistent comparator whose observable
        // effect is to reverse each group of same-length prefixes.  That is
        // why +1 answers [UM, US, Canada] and not [Canada, US, UM].  Encoded
        // here rather than left to depend on the engine's sort.
        (byPrefix[prefix] || (byPrefix[prefix] = [])).unshift(r);
        lengths[prefix.length] = true;
    }

    // longest prefix first, so +1-246 leads Barbados ahead of the +1 block
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
// 1432 subdivisions and their aliases, and most callers never ask.

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

            // an alias is an array or null.  Three entries used to carry a
            // bare string, and String.indexOf is a substring search, so
            // findByProvince('B') answered Vietnam by way of 'Binh Phuoc'.
            const alias = p.alias;
            if (!alias) continue;
            for (const a of Array.isArray(alias) ? alias : [alias]) add(a, r);
        }

    return map;
}

// -- the module --------------------------------------------------------------

const country = {
    /** Every country, keyed by ISO 3166-1 alpha-2 code. */
    all,

    /**
     * Memoised lookup results, keyed by field then by query. Exposed because
     * it always has been; lookups are index reads and do not depend on it.
     */
    cache,

    /** Find by ISO 3166-1 alpha-2 code. Falls back to a case-insensitive match. */
    findByIso2(code: string): Country | undefined {
        const r = all[code];
        if (r) return transform(r);
        if (typeof code !== 'string') return undefined;
        const hit = lowercase().iso2[code.toLowerCase()];
        return hit && transform(hit[0]);
    },

    /** Find by ISO 3166-1 alpha-3 code. */
    findByIso3: (code: string): Found => find('iso3', code),

    /** Find by name. Accepts native forms, official long forms and modern ISO names. */
    findByName: (name: string): Found => find('name', name),

    /** Find by capital city. */
    findByCapital: (name: string): Found => find('capital', name),

    /** Find by ISO 4217 code. Retired codes still resolve to the countries that used them. */
    findByCurrency: (code: string): Found => find('currency', code),

    /** Find by first-tier subdivision, by name or by alias. */
    findByProvince(name: string): Found {
        if (!cache.province) cache.province = {};
        if (!(name in cache.province))
            cache.province[name] = pack(provinceIndex().get(name));
        return copy(cache.province[name]);
    },

    /**
     * Find by telephone number. Returns every country whose dialing code is a
     * prefix of the number, most specific first.
     *
     * `{longestMatch: true}` narrows to the most specific prefix, so
     * `'+1246...'` answers Barbados alone rather than
     * `[Barbados, UM, US, Canada]`.
     */
    findByPhoneNbr(nbr: string, opts?: PhoneOptions): Found {
        // a lookup has no business throwing on bad input: 3.1.8 raised a
        // TypeError for anything that was not a string, where every other
        // finder simply returned undefined
        if (typeof nbr !== 'string') return undefined;

        const digits = nbr.replace(/\D/g, '');
        if (!digits) return undefined;

        // probe one hash per distinct prefix length, longest first, rather
        // than testing the number against all 250 prefixes
        const longestOnly = !!(opts && opts.longestMatch);
        let hits: CountryRecord[] = [];
        for (const len of prefixLengths) {
            const found = byPrefix[digits.slice(0, len)];
            if (!found) continue;
            hits = hits.concat(found);
            if (longestOnly) break;
        }
        return pack(hits);
    },

    /** List one field across every country, in canonical order. */
    ls<K extends keyof CountryRecord>(field: K): CountryRecord[K][] {
        return records.map(r => r[field]);
    },

    /** The seven continents. */
    continents(): ContinentName[] {
        const seen = country.ls('continent');
        return seen.filter((c, i) => seen.indexOf(c) === i);
    },

    /** Every country name, in canonical order. */
    names(): string[] {
        return country.ls('name');
    },

    /** Every capital, in canonical order. */
    capitals(): string[] {
        return country.ls('capital');
    },
};

// -- Array.prototype ---------------------------------------------------------

// Installed since 1.0 for the convenience of callers, and kept because callers
// may use them. They are deliberately not declared in the published types:
// nothing here uses them, and new code should not start.
//
// They must not be enumerable. An enumerable prototype property shows up in
// every for..in loop over an array in the host application.

const helpers: Record<string, (this: unknown[], ...args: unknown[]) => unknown> = {
    unpack(...args) {
        const l = this.length;
        return l === 1 ? this[0] : l === 0 && args.length > 0 ? undefined : this;
    },
    unique() {
        return this.filter((e, pos) => this.indexOf(e) === pos);
    },
};

for (const name of Object.keys(helpers))
    Object.defineProperty(Array.prototype, name, {
        configurable: true,
        writable: true,
        enumerable: false,
        value: helpers[name],
    });

export default country;
