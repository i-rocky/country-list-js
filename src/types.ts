// Public types.  Iso2, Iso3 and CurrencyCode are generated from the data by
// scripts/build-data.js, so an editor autocompletes every code and a typo is a
// compile error rather than an undefined at runtime.

import type {Iso2, Iso3, CurrencyCode, ContinentName} from './generated';

export type {Iso2, Iso3, CurrencyCode, ContinentName};

/** A country's ISO 3166-1 codes. `numeric` is absent for Kosovo, which is user-assigned. */
export interface CountryCode {
    iso2: Iso2;
    iso3: Iso3;
    numeric: string | undefined;
}

export interface Currency {
    code: CurrencyCode;
    symbol: string;
    /** Number of minor units the currency divides into: 2 for USD, 0 for JPY. */
    decimal: number;
}

/**
 * A political subdivision. Every key is always present, and null where the
 * country has no such thing -- there is nothing to test for.
 *
 * Which tier this is varies by country: most match ISO 3166-2's first tier,
 * some sit one below it, and `region` names the parent where there is one.
 * See "Subdivisions" in the README.
 */
export interface Province {
    name: string;
    /** Local subdivision code: 'AL' for Alabama. Null where there is none. */
    code: string | null;
    /** Parent grouping: 'England' for Berkshire. Null where there is none. */
    region: string | null;
    /** Alternative names. Always a list or null -- never a bare string. */
    alias: string[] | null;
}

/**
 * Every key is always present. The ones that can be `undefined` are undefined
 * for territories where the value does not exist -- an uninhabited island has
 * no timezone, an island nation has no land border.
 */
export interface Country {
    name: string;
    continent: ContinentName;
    region: string;
    capital: string;
    currency: Currency;
    dialing_code: string;
    provinces: Province[] | undefined;
    code: CountryCode;

    /** Endonym, where it differs from `name`. */
    native_name: string | undefined;
    /** What a person from this country is called in English. */
    demonym: string | undefined;
    /** ISO 639 codes. */
    languages: string[] | undefined;
    /** Country code top-level domains, dot first, possibly internationalized. */
    tld: string[] | undefined;
    /** Land area in square kilometres. */
    area: number | undefined;
    /** Approximate geographic centre, `[latitude, longitude]`. */
    latlng: [number, number] | undefined;
    /** IANA time zone identifiers. */
    timezones: string[] | undefined;
    /** ISO-2 codes of neighbours. Symmetric: if A borders B, B borders A. */
    borders: Iso2[] | undefined;
}

/** The stored record. Exposed through `all`; flatter than what finders return. */
export interface CountryRecord {
    iso2: Iso2;
    iso3: Iso3;
    iso_numeric?: string;
    name: string;
    continent: ContinentName;
    region: string;
    capital: string;
    currency: CurrencyCode;
    currency_symbol: string;
    currency_decimal: number;
    dialing_code: string;
    provinces: Province[] | undefined;
    native_name?: string;
    demonym?: string;
    languages?: string[];
    tld?: string[];
    area?: number;
    latlng?: [number, number];
    timezones?: string[];
    borders?: Iso2[];
}
