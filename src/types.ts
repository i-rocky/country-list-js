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
    /** The symbol the currency is written with: `kr` for DKK, `₹` for INR. The code where it has none. */
    symbol: string;
    /** Minor unit exponent per ISO 4217: 2 for USD, 0 for JPY, 3 for BHD. */
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
 * where the value does not exist -- Antarctica has no capital and no currency,
 * an uninhabited island has no time zone, an island nation has no land border.
 */
export interface Country {
    name: string;
    continent: ContinentName;
    /** UN M49 region: `Northern Europe`, `Caribbean`, `Eastern Asia`. */
    region: string;
    capital: string | undefined;
    currency: Currency | undefined;
    /** ITU-T E.164 country calling code, digits only: `45`, `1`, `44`. */
    dialing_code: string | undefined;
    /**
     * Where the calling code is shared, the area codes that belong to this
     * territory within it: `['268']` for Antigua under +1, `['1534']` for
     * Jersey under +44. Undefined where the calling code alone identifies the
     * country, and for the principal holder of a shared code.
     */
    area_codes: string[] | undefined;
    provinces: Province[] | undefined;
    code: CountryCode;

    /** Endonym, where it differs from `name`. */
    native_name: string | undefined;
    /** What a person from this country is called in English. */
    demonym: string | undefined;
    /**
     * Languages with official status for the whole country, as ISO 639-1
     * codes, or ISO 639-3 where the language has no two-letter code.
     */
    languages: string[] | undefined;
    /** Country code top-level domains delegated in the IANA root, dot first, possibly internationalized. */
    tld: string[] | undefined;
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
    capital?: string;
    currency?: CurrencyCode;
    currency_symbol?: string;
    currency_decimal?: number;
    dialing_code?: string;
    area_codes?: string[];
    provinces: Province[] | undefined;
    native_name?: string;
    demonym?: string;
    languages?: string[];
    tld?: string[];
    latlng?: [number, number];
    timezones?: string[];
    borders?: Iso2[];
}
