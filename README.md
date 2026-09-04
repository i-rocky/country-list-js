# country-list-js

[![npm version](https://img.shields.io/npm/v/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![CI](https://github.com/i-rocky/country-list-js/actions/workflows/ci.yml/badge.svg)](https://github.com/i-rocky/country-list-js/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dm/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](package.json)
[![Types](https://img.shields.io/npm/types/country-list-js.svg)](index.d.ts)
[![License](https://img.shields.io/github/license/i-rocky/country-list-js.svg)](LICENSE)

> ## ⚠️ 4.0 breaks with 3.1.8. Read this before upgrading.
>
> The last release was 3.1.8 in 2023. 4.0 is a rewrite, and it changes
> what the finders return and what the data says. The ones most likely to
> bite:
>
> - `findByCapital`, `findByCurrency`, `findByProvince` and `findByPhoneNbr`
>   **always return an array**, empty on a miss. They used to return a
>   country, an array or `undefined` depending on how many matched.
> - `currency.decimal` is a **number**, not the string `'2'`.
> - `dialing_code` is the country calling code alone (`'1'`, not
>   `'+1-268'`); the rest is in the new `area_codes`.
> - `capital`, `currency` and `dialing_code` are **`undefined`** where a
>   territory has none, not `''`.
> - `cache`, `Array.prototype.unpack`/`unique` and the
>   `country-list-js/data/*.json` deep imports are **gone**.
> - Capitals, regions, names, currencies, subdivisions, borders and more
>   were **corrected against their sources**. Values you compared against
>   by string may differ.
>
> All twenty-one changes, with the reason for each, are in
> [CHANGELOG.md](CHANGELOG.md#breaking-changes). To stay on the old
> behaviour, pin `"country-list-js": "^3"`.

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

Lookups try the exact value first. If that misses, they try again with case
and Latin diacritics folded away, and `findByName` also tries
662 alternative names — native forms, official long forms, and the names
countries carried before they were renamed:

```js
country.findByName('denmark');         // Denmark
country.findByName('Danmark');         // Denmark
country.findByName('USA');             // United States
country.findByName('Turkey');          // Türkiye
country.findByName('Swaziland');       // Eswatini
country.findByName('Czech Republic');  // Czechia
country.findByName('Sao Tome and Principe');   // São Tomé and Príncipe
country.findByCapital('Bogota');       // [Colombia]  — the capital is Bogotá
country.findByProvince('Cordoba');     // [Argentina, Spain]
```

The exact value always wins, so adding an alias can never change a lookup that
already worked. Only the combining marks of the Latin, Greek and Cyrillic
scripts are folded; the vowel signs of Indic and Arabic scripts are letters and
stay.

### Telephone numbers

`dialing_code` is the ITU-T E.164 country calling code, digits only. Where a
code is shared, `area_codes` holds the area codes that belong to the territory
within it — `'1'` and `['268']` for Antigua, `'44'` and `['1534']` for Jersey,
`'7'` and `['6', '7']` for Kazakhstan. `findByPhoneNbr` answers on the most
specific prefix that matches:

```js
country.findByPhoneNbr('+12465551212');   // [Barbados]
country.findByPhoneNbr('+18095551212');   // [Dominican Republic]  — 809, 829 or 849
country.findByPhoneNbr('+77271234567');   // [Kazakhstan]          — +7 6xx and 7xx
country.findByPhoneNbr('+74951234567');   // [Russia]
```

A code shared at the same length still returns every holder:

```js
country.findByPhoneNbr('+12125551212').map(c => c.name);
// ['Canada', 'United States', 'United States Minor Outlying Islands']
country.findByPhoneNbr('+262262123456').map(c => c.name);
// ['Mayotte', 'Réunion']
```

### Lists

```js
country.names();          // all 250 names
country.capitals();       // one per country; undefined for the six that have none
country.continents();     // the 7 continents
country.ls('region');     // any field, across every country
country.all;              // everything, keyed by ISO-2
```

## What a country looks like

```js
{
  name: 'Denmark',
  continent: 'Europe',
  region: 'Northern Europe',
  capital: 'Copenhagen',
  currency: { code: 'DKK', symbol: 'kr', decimal: 2 },
  dialing_code: '45',
  area_codes: undefined,
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
  latlng: [56, 10],
  timezones: ['Europe/Copenhagen'],
  borders: ['DE']
}
```

Every key is always present. The ones that can be `undefined` are undefined
where the value does not exist: Antarctica has no capital and no currency, an
uninhabited territory has no time zone or dialing code, an island nation has
no land border, Kosovo has no ISO numeric code. Nothing is ever an empty
string.

## Notes on the data

Every field below was checked for 4.0 against the source named for it. Where
the sources are standards, the standard is followed; where they are facts on
the ground, the ground is.

**Names** are the common short name in English, spelled as the place spells
it — `Åland Islands`, `Curaçao`, `Réunion`, `São Tomé and Príncipe` — and the
*current* one: a country that has been renamed carries the name it was renamed
to — `Türkiye`, `Eswatini`, `Czechia`, `Cabo Verde`, `North Macedonia`,
`Timor-Leste`, `Côte d'Ivoire`, `Holy See`. Every former name is an alias, and
the accented ones are found without their accents, so lookups that worked
before still work.

They are not ISO 3166-1's *registered* short names, which are inverted for
indexing — `Korea, Republic of`, `Russian Federation`, `Virgin Islands,
British`. Where ISO reads like a registry rather than a name, the common form
is kept: `South Korea`, `Russia`, `British Virgin Islands`.

**Capitals** are the official capital, spelled as it is in English with its
diacritics — `Bogotá`, `Reykjavík`, `Kyiv`, `Nukuʻalofa`. Where a country
separates the roles, the constitutional one is carried: Sucre for Bolivia, Sri
Jayawardenepura Kotte for Sri Lanka, Gitega for Burundi, Ciudad de la Paz for
Equatorial Guinea since January 2026. Six territories have none — Antarctica,
Bouvet Island, the Caribbean Netherlands, Heard Island, Tokelau and the U.S.
Minor Outlying Islands — and carry `undefined`, not `''`.

**Regions and continents** are the [UN M49
geoscheme](https://unstats.un.org/unsd/methodology/m49/): `region` is the
intermediate region where the scheme has one, otherwise the sub-region —
`Northern Europe`, `Caribbean`, `Eastern Asia`, `Australia and New Zealand` —
and `continent` is the continent M49 places the region in, with the Americas
split into North and South. That puts Cyprus in Western Asia, Mexico in
Central America, the French Southern Territories in Eastern Africa and the
Cocos Islands with Australia. M49 does not code Taiwan or Kosovo; they are
Eastern Asia and Southern Europe here.

**Currencies** follow ISO 4217: `code` is the current code and `decimal` the
minor unit exponent — 2 for USD, 0 for JPY, 3 for BHD. `symbol` is the symbol
[CLDR](https://cldr.unicode.org/) gives the currency in English, its local
symbol where CLDR's English one is only the code, and the code where it has
neither: `kr` for DKK, `₹` for INR, `A$` for AUD, `AED` for AED. Codes ISO has
retired still resolve to the country that used them, so `findByCurrency('HRK')`
answers Croatia even though Croatia is on the euro now. Antarctica has no
currency.

**Dialing codes** are ITU-T E.164 country calling codes, digits only — `1`,
`44`, `358`. A territory that shares its code carries the area codes that
identify it in `area_codes`: the 23 North American Numbering Plan members
under `+1`, Guernsey, Jersey and the Isle of Man under `+44`, Åland under
`+358`, Curaçao and the Caribbean Netherlands under `+599`, Norfolk Island and
the Australian Antarctic bases under `+672`, Svalbard under `+47`, Kazakhstan
and Russia under `+7`, the Cocos and Christmas Islands under `+61`. Réunion and
Mayotte share `+262` and Guadeloupe, Saint Barthélemy and Saint Martin share
`+590` with no area code that separates them, so a number on those codes
answers every holder. Bouvet Island, Heard Island and the French Southern
Territories have no telephone service and no code.

**Languages** are the languages with official status for the whole country,
de jure or, where the law names none, the de facto national language, as ISO
639-1 codes — 639-3 where the language has no two-letter code, so Montenegro
is `cnr` and Fiji Hindi is `hif`. Regional co-official languages are not
listed: Spain is `es`, Peru is `es`. Where a constitution names every language
in the country official, every one with an ISO 639 code is listed: South
Africa has twelve, Zimbabwe fifteen. A language without a code — Comorian,
Algerian Tamazight — cannot be listed and is not.

**Native names** are the short name in the country's official languages other
than English, where it differs from the English name, joined with ` / ` in the
order of `languages`: `Danmark`, `Schweiz / Suisse / Svizzera / Svizra`,
`Singapura / சிங்கப்பூர் / 新加坡`. Absent where every official language is
English, or the name is the same in the country's own language — `France`,
`Portugal`.

**Demonyms** are as the English Wikipedia infobox gives them, the first
adjectival form where it gives several.

**Top-level domains** are the country-code domains delegated in the [IANA root
zone](https://www.iana.org/domains/root/db) — `.uk` and not the reserved
`.gb`, internationalized domains included, so India has sixteen. Codes ISO
3166 assigns that were never delegated — `.bl`, `.bq`, `.eh`, `.mf`, `.um` —
are not listed.

**Coordinates** are an approximate centre, to about a degree, and no more
precise than that.

**Time zones** are the rows of the [IANA time zone
database](https://www.iana.org/time-zones)'s `zone.tab` for the country, which
names the country's own zone — `Europe/Copenhagen`, not the `Europe/Berlin`
that `zone1970.tab` folds it into. Kosovo has no row and is given
`Europe/Belgrade`, the zone it keeps.

**Borders** are land borders as they stand, and symmetric: if A borders B then
B borders A. Maritime neighbours are not borders — Sri Lanka has none — and a
claim is not a border: India and Afghanistan are not neighbours, because the
territory between them is administered by Pakistan. A territory listed
separately carries its own borders rather than lending them to the state that
administers it: French Guiana borders Brazil and Suriname, France does not;
Saint Martin borders Sint Maarten; Greenland borders Canada across Hans
Island, divided in 2022. Cyprus has none: its only land border is with
Akrotiri and Dhekelia, which has no ISO code.

**Subdivisions** cover 31 of the 250 countries. Every entry carries the same
four keys — `name`, `code` (the local subdivision code, `AL` for Alabama),
`region` (the parent unit, where the country has one above this tier) and
`alias` — null where the country has no such thing, so there is nothing to
test for before reading one.

**They are not all at the same tier, and that is worth knowing before you rely
on them.** Checked against ISO 3166-2, eleven countries match its first tier
exactly: Canada, Brazil, Germany, Mexico, India, China, the Netherlands, Japan,
Argentina, the United Kingdom and the United States.

Seven sit one tier lower — Spain's 50 provinces rather than 17 autonomous
communities and 2 autonomous cities, Italy's 106 provinces rather than 20 regions, Peru's 196 rather
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

**All 31 lists were audited against ISO 3166-2 for 4.0**, and fourteen of them
were wrong — see the changelog. Pakistan was still listing divisions abolished
in 2000, Cuba had four capital cities where provinces belonged, and the United
Kingdom's were counties abolished in 1965 and 1996. Where ISO itself lags the
country, the country wins: Ethiopia carries the fourteen regions it has, not
the twelve ISO still lists.

Names that were superseded stay reachable — `findByProvince('Compostela
Valley')` still answers, as do `Bogra`, `Chittagong` and `Northern Areas` —
except where a unit was dissolved outright rather than renamed. Vietnam's 29
merged-away provinces are gone: recording Hà Giang as another name for Tuyên
Quang would trade a stale fact for a false one. An alias is a genuinely
different name: the ASCII form of an accented name is not stored, because the
lookup finds it anyway.

**Not carried: area and population.** No two sources agree on what a
country's area includes — Hong Kong is 1,104 km² of land or 2,755 km² with its
waters, Serbia is 77,589 km² or 88,499 km² depending on Kosovo — and a number
nobody can check is not data. Population changes every year.

**Sources.** ISO 3166-1 and 3166-2, and every per-country fact — capitals,
currencies, calling codes, official languages, native names, coordinates —
from [Wikidata](https://www.wikidata.org/) (CC0), cross-checked against the
English Wikipedia infoboxes and the numbering-plan articles. UN M49 from the
[UN Statistics Division](https://unstats.un.org/unsd/methodology/m49/). ISO
4217 from the [maintenance agency's list
one](https://www.six-group.com/en/products-services/financial-information/data-standards.html).
Currency symbols from [CLDR](https://cldr.unicode.org/). Top-level domains
from the [IANA root zone database](https://www.iana.org/domains/root/db).
Time zones from the [IANA time zone database](https://www.iana.org/time-zones).
The data is maintained here, in `catalog/`.

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
