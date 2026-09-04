// Compiled against the installed package by scripts/verify-package.js, so the
// shipped declarations are checked the way a consumer sees them rather than
// the way the source tree does.

import country, {Country, Iso2, Iso3, Province, Currency} from 'country-list-js';

// a finder on a unique field: one country or undefined
const dk: Country | undefined = country.findByIso2('DK');
if (dk) {
    const name: string = dk.name;
    const cur: Currency | undefined = dk.currency;   // Antarctica has none
    const decimal: number | undefined = cur && cur.decimal;   // ISO 4217 minor units, a number
    const capital: string | undefined = dk.capital;
    const dialing: string | undefined = dk.dialing_code;
    const area: string[] | undefined = dk.area_codes;
    const borders: Iso2[] | undefined = dk.borders;
    const tz: string[] | undefined = dk.timezones;
    const prov: Province[] | undefined = dk.provinces;
    const numeric: string | undefined = dk.code.numeric;
    console.log(name, decimal, capital, dialing, area, borders, tz, prov, numeric);
}
const capitals: (string | undefined)[] = country.capitals();

// a finder that can match several: always a list, never undefined
const euro: Country[] = country.findByCurrency('EUR');
const caps: Country[] = country.findByCapital('Kingston');
const phone: Country[] = country.findByPhoneNbr('+1246');
const provs: Country[] = country.findByProvince('Texas');

// a subdivision carries all four keys
if (dk && dk.provinces) {
    const p: Province = dk.provinces[0];
    const code: string | null = p.code;
    const region: string | null = p.region;
    const alias: string[] | null = p.alias;
    console.log(code, region, alias);
}

const iso2: Iso2 = 'DK';
const iso3: Iso3 = 'DNK';
const list: string[] = country.names();
console.log(euro.length, caps.length, phone.length, provs.length,
            iso2, iso3, list.length, capitals.length, country.continents());
