# country-list-js

[![npm version](https://img.shields.io/npm/v/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![CI](https://github.com/i-rocky/country-list-js/actions/workflows/ci.yml/badge.svg)](https://github.com/i-rocky/country-list-js/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dm/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](package.json)
[![Types](https://img.shields.io/npm/types/country-list-js.svg)](index.d.ts)
[![License](https://img.shields.io/github/license/i-rocky/country-list-js.svg)](LICENSE)

Country data for 250 countries and territories: ISO 3166-1 codes, names,
capitals, currencies, dialing codes, subdivisions, land borders and
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

Three of the fields are unique, so those finders answer **a country or
`undefined`**:

```js
country.findByIso2('DK').name;    // 'Denmark'   by ISO 3166-1 alpha-2
country.findByIso3('DNK').name;   // 'Denmark'   by ISO 3166-1 alpha-3
country.findByName('Denmark');    //             by name
country.findByIso2('ZZ');         // undefined
```

The rest can match more than one country, so they always answer **a list**,
empty when nothing matched — never a bare country, never `undefined`:

```js
country.findByCapital('Copenhagen');    // [Denmark]
country.findByCapital('Kingston');      // [Jamaica, Norfolk Island]
country.findByCurrency('EUR').length;   // 37
country.findByProvince('Zealand');      // [Denmark]  by subdivision or alias
country.findByPhoneNbr('+4505551212');  // [Denmark]
country.findByCurrency('ZZZ');          // []
```

You never have to test the shape of a result before using it.

Lookups try the exact value first. If that misses, they try again
case-insensitively, and `findByName` also tries 682 alternative names — native
forms, official long forms, and the names countries carried before they were
renamed:

```js
country.findByName('denmark');         // Denmark
country.findByName('Danmark');         // Denmark
country.findByName('USA');             // United States
country.findByName('Turkey');          // Türkiye
country.findByName('Swaziland');       // Eswatini
country.findByName('Czech Republic');  // Czechia
```

The exact value always wins, so adding an alias can never change a lookup that
already worked.

### Telephone numbers

`findByPhoneNbr` answers on the most specific dialing code that prefixes the
number. `+1-246` is Barbados, not the whole `+1` block:

```js
country.findByPhoneNbr('+12465551212');   // [Barbados]
```

Codes genuinely shared at the same length still return every country holding
them:

```js
country.findByPhoneNbr('+12125551212').map(c => c.name);
// ['Canada', 'United States', 'United States Minor Outlying Islands']
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
  currency: { code: 'DKK', symbol: 'Dkr', decimal: 2 },
  dialing_code: '45',
  provinces: [
    { name: 'Hovedstaden', code: null, region: null, alias: null },
    { name: 'Midtjylland',  code: null, region: null, alias: null },
    { name: 'Nordjylland',  code: null, region: null, alias: null },
    { name: 'Sjælland',     code: null, region: null, alias: ['Zealand'] },
    { name: 'Syddanmark',   code: null, region: null, alias: null }
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

## Notes on the data

**Names** are the common short name in English, and the *current* one: a
country that has been renamed carries the name it was renamed to — `Türkiye`,
`Eswatini`, `Czechia`, `Cabo Verde`, `North Macedonia`, `Timor-Leste`,
`Côte d'Ivoire`, `Holy See`. Every former name is an alias, so lookups that
worked before still work.

They are not ISO 3166-1's *registered* short names, which are inverted for
indexing — `Korea, Republic of`, `Russian Federation`, `Virgin Islands,
British`. Where ISO reads like a registry rather than a name, the common form
is kept: `South Korea`, `Russia`, `British Virgin Islands`.

**Capitals** are transliterated to ASCII — `Reykjavik`, not `Reykjavík`.

**Currencies** follow ISO 4217. Codes ISO has retired still resolve to the
country that used them, so `findByCurrency('HRK')` answers Croatia even though
Croatia is on the euro now.

**Time zones** come from the [IANA time zone
database](https://www.iana.org/time-zones), which is in the public domain.

**Borders** are land borders, and symmetric: if A borders B then B borders A.
Maritime neighbours are not borders — Sri Lanka has none, because the Palk
Strait is not a land boundary. A territory listed separately carries its own
borders rather than lending them to the state that administers it: French
Guiana borders Brazil and Suriname; France does not.

One entry is a live territorial dispute rather than a fact. India and
Afghanistan are recorded as neighbours, which holds only across
Pakistan-administered Gilgit-Baltistan — territory India claims and does not
control. It is kept because removing it would take the opposite side just as
firmly, and named here so it is a documented choice rather than a silent one.

**Subdivisions** cover 31 of the 250 countries. Every entry carries the same
four keys — `name`, `code` (the local subdivision code, `AL` for Alabama),
`region` (the parent unit, where the country has one above this tier) and
`alias` — null where the country has no such thing, so there is nothing to
test for before reading one.

**They are not all at the same tier, and that is worth knowing before you rely
on them.** Checked against ISO 3166-2, eleven countries match its first tier
exactly: Canada, Brazil, Germany, Mexico, India, China, the Netherlands, Japan,
Argentina, the United Kingdom and the United States.

Seven sit one tier lower — Spain's 48 provinces rather than 19 autonomous
communities, Italy's 106 provinces rather than 20 regions, Peru's 196 rather
than 26, and likewise the Philippines, Bangladesh, Bolivia and Chile. For
Bangladesh, Bolivia, Chile and Peru the `region` field names the parent unit,
so those are coherent one tier down.

Australia is ISO's eight states and territories plus eight external and
internal territories ISO does not code — Christmas Island, the Cocos Islands,
Norfolk Island and Heard Island and McDonald Islands among them. Those four
are also countries in their own right in this dataset, because ISO 3166-1
assigns them their own codes. Both facts are true at once, and
`findByProvince('Norfolk Island')` answers Australia while
`findByIso2('NF')` answers Norfolk Island.

This is inherited data whose provenance predates the 4.0 rewrite. It is checked
for structure — unique within a country, aliases well formed, no duplicate
(name, region) pair — but the *currency* of each list is verified only where
this changelog says so. Vietnam and the United Kingdom were both found to be
years out of date and corrected in 4.0; the other 29 have not been audited
against ISO 3166-2 one by one. Treat `code` and `name` as reliable and the
completeness of a country's list as unwarranted.

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
