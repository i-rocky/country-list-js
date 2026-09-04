// Public types.  Iso2, Iso3 and CurrencyCode are generated from the data by
// scripts/build-data.js, so an editor autocompletes all 250 codes and a typo is a
// compile error rather than an undefined at runtime.

import type {Iso2, Iso3, CurrencyCode, ContinentName} from './generated';

export type {Iso2, Iso3, CurrencyCode, ContinentName};

/** A country's ISO 3166-1 codes. `numeric` is absent for Kosovo, which is user-assigned. */
export interface CountryCode {
    iso2: Iso2;
    iso3: Iso3;
    numeric: string | undefined;
}

/**
 * `decimal` is the number of minor units, as a string -- `'2'`, not `2`.
 * It has been a string since 1.0 and callers parse it as one.
 */
export interface Currency {
    code: CurrencyCode;
    symbol: string;
    decimal: string;
}

/** A first-tier political subdivision. */
export interface Province {
    name: string;
    /** Alternative names, or null. Always a list -- never a bare string. */
    alias: string[] | null;
    /** Local subdivision code, where one exists. */
    short?: string;
    /** Parent grouping, where the country has one above provinces. */
    region?: string;
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

/** No match is `undefined`, one match is the country, several are an array. */
export type Found = Country | Country[] | undefined;

export interface PhoneOptions {
    /**
     * Narrow the result to the most specific prefix: `'+1246...'` answers
     * Barbados alone rather than `[Barbados, UM, US, Canada]`.
     * Off by default.
     */
    longestMatch?: boolean;
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
    currency_decimal: string;
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
