# country-list-js

[![npm version](https://img.shields.io/npm/v/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![CI](https://github.com/i-rocky/country-list-js/actions/workflows/ci.yml/badge.svg)](https://github.com/i-rocky/country-list-js/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dm/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](package.json)
[![Types](https://img.shields.io/npm/types/country-list-js.svg)](index.d.ts)
[![License](https://img.shields.io/github/license/i-rocky/country-list-js.svg)](LICENSE)

Country data for 250 countries and territories: ISO 3166-1 codes, names,
capitals, currencies, dialing codes, first-tier subdivisions, land borders and
IANA time zones.

No runtime dependencies. Ships CommonJS, ESM, TypeScript types and a browser
bundle.

## Install

```sh
npm install country-list-js
```

```js
const country = require('country-list-js');          // CommonJS
import country from 'country-list-js';               // ESM
import { findByIso2, names } from 'country-list-js'; // ESM, named
```

In a browser, from a CDN:

```html
<script src="https://unpkg.com/country-list-js@4/dist/country.min.js"></script>
<script>
  console.log(country.findByIso2('DK').name);   // Denmark
</script>
```

## Looking things up

```js
country.findByIso2('DK');            // by ISO 3166-1 alpha-2
country.findByIso3('DNK');           // by ISO 3166-1 alpha-3
country.findByName('Denmark');       // by name
country.findByCapital('Copenhagen'); // by capital
country.findByCurrency('DKK');       // by ISO 4217 code
country.findByProvince('Zealand');   // by subdivision, name or alias
country.findByPhoneNbr('+4505551212');
```

Nothing found is `undefined`. One match is the country itself. Several matches
are an array:

```js
country.findByIso2('DK').name;              // 'Denmark'
country.findByCurrency('EUR').length;       // 37
country.findByIso2('ZZ');                   // undefined
```

Lookups try the exact value first. If that misses, they try again
case-insensitively, and `findByName` also tries 682 alternative names — native
forms, official long forms, and the current ISO short names for countries this
list still records under an older one:

```js
country.findByName('denmark');    // Denmark
country.findByName('Danmark');    // Denmark
country.findByName('Türkiye');    // Turkey
country.findByName('Eswatini');   // Swaziland
country.findByName('Czechia');    // Czech Republic
country.findByName('USA');        // United States
```

The exact value always wins, so adding an alias can never change a lookup that
already worked.

### Telephone numbers

`findByPhoneNbr` returns every country whose dialing code prefixes the number,
most specific first. `+1-246` is Barbados and `+1` is three more territories,
so all four come back:

```js
country.findByPhoneNbr('+12465551212').map(c => c.name);
// ['Barbados', 'United States Minor Outlying Islands', 'United States', 'Canada']
```

Pass `{longestMatch: true}` for the most specific prefix only:

```js
country.findByPhoneNbr('+12465551212', {longestMatch: true}).name;   // 'Barbados'
```

### Lists

```js
country.names();          // all 250 names
country.capitals();       // all 250 capitals
country.continents();     // the 7 continents
country.ls('region');     // any field, across every country
country.all;              // everything, keyed by ISO-2
```

## What a country looks like

```js
{
  name: 'Denmark',
  continent: 'Europe',
  region: 'Scandinavia, Nordic Countries',
  capital: 'Copenhagen',
  currency: { code: 'DKK', symbol: 'Dkr', decimal: '2' },
  dialing_code: '45',
  provinces: [
    { name: 'Hovedstaden', alias: null },
    { name: 'Midtjylland', alias: null },
    { name: 'Nordjylland', alias: null },
    { name: 'Sjælland', alias: ['Zealand'] },
    { name: 'Syddanmark', alias: null }
  ],
  code: { iso2: 'DK', iso3: 'DNK', numeric: '208' },
  native_name: 'Danmark',
  demonym: 'Danish',
  languages: ['da'],
  tld: ['.dk'],
  area: 43094,
  latlng: [56, 10],
  timezones: ['Europe/Copenhagen'],
  borders: ['DE']
}
```

Every key is always present. The ones that can be `undefined` are undefined
where the value does not exist: an uninhabited territory has no time zone, an
island nation has no land border, Kosovo has no ISO numeric code.

`currency.decimal` is a **string**, not a number. It has been since 1.0.

## Notes on the data

**Names** are common short names in English, transliterated to ASCII —
`Ivory Coast`, not `Côte d'Ivoire`; `Reykjavik`, not `Reykjavík`. They are not
ISO 3166-1 official names. Both forms resolve through `findByName`.

**Currencies** follow ISO 4217. Codes ISO has retired still resolve to the
country that used them, so `findByCurrency('HRK')` answers Croatia even though
Croatia is on the euro now.

**Time zones** come from the [IANA time zone
database](https://www.iana.org/time-zones), which is in the public domain.

**Borders** are symmetric: if A borders B then B borders A. Some entries
follow de-facto rather than universally recognised boundaries.

**Subdivisions** are first-tier only, and 31 of the 250 countries have them.

**Sources.** Native names, demonyms, languages, TLDs, areas, coordinates,
borders and the alternative-name list were imported from
[countryinfo](https://github.com/porimol/countryinfo), which is MIT licensed.
The imports are recorded in `scripts/import/`; the data is maintained here, in
`catalog/`.

## TypeScript

Types ship with the package; nothing extra to install. The ISO code types are
literal unions of the real codes, so typos are compile errors:

```ts
import country, { Country, Iso2 } from 'country-list-js';

const dk: Country | undefined = country.findByIso2('DK');
const code: Iso2 = 'DKK';   // Type '"DKK"' is not assignable to type 'Iso2'
```

## Contributing

Country data lives in `catalog/countries/<ISO2>.json`, one file per country,
validated against `catalog/country.schema.json`. Correcting a country is a
one-line diff. Everything under `data/` is generated from those files — don't
edit it.

See [CONTRIBUTING.md](CONTRIBUTING.md).

```sh
npm install        # installs, and builds data/
npm test           # lint, typecheck, validate the data, run the suite
npm run build      # data, types and bundles
npm run site       # assemble the demo site into build/site/
```

## Licence

MIT
