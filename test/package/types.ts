import country, {Country, Iso2, Iso3, Province, Currency, Found} from 'country-list-js';

const dk: Country | undefined = country.findByIso2('DK');
if (dk) {
    const name: string = dk.name;
    const cur: Currency = dk.currency;
    const decimal: number = cur.decimal;          // minor units, a number
    const borders: Iso2[] | undefined = dk.borders;
    const tz: string[] | undefined = dk.timezones;
    const prov: Province[] | undefined = dk.provinces;
    const numeric: string | undefined = dk.code.numeric;
    console.log(name, decimal, borders, tz, prov, numeric);
}

const found: Found = country.findByCurrency('EUR');
const iso2: Iso2 = 'DK';
const iso3: Iso3 = 'DNK';
const list: string[] = country.names();
const conts = country.continents();
const one = country.findByPhoneNbr('+1246');
console.log(found, iso2, iso3, list.length, conts, one);
