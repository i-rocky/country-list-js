# Changelog

## 4.0.0

The last release was 3.1.8, in October 2023. `master` has been broken since
shortly after: `require('country-list-js')` threw on load, so nothing could be
published.

**This release breaks with 3.1.8 deliberately.** Read the next section before
upgrading. Every break is declared in `test/contract.js`, which diffs this
release against the real published 3.1.8 for all 250 countries and every
recorded call, fails on any difference that is not declared with a reason, and
fails again if a declared difference turns out not to have happened.

### Breaking changes

Twenty-one of them, ordered by how likely they are to bite. The first is the
only one that fails quietly.

1. **`currency.decimal` is a number.** It was the string `'2'`; it is now `2`.
   Code doing `c.currency.decimal === '2'` now always misses, silently. Code
   doing `parseInt(...)` is unaffected. It is also *correct* now: it is the
   ISO 4217 minor unit exponent, which 3.1.8 had wrong for 21 currencies —
   the forint, rupiah, Colombian peso and Pakistani rupee are 2, not 0; the
   Iraqi dinar is 3.

2. **Every finder has one return type.** 3.1.8 gave you a country when one
   matched, an array when several did and `undefined` when none did, so the
   shape depended on the data rather than the call.

   | | returns |
   |---|---|
   | `findByIso2` `findByIso3` `findByName` | `Country` or `undefined` |
   | `findByCapital` `findByCurrency` `findByProvince` `findByPhoneNbr` | `Country[]`, empty on a miss |

   The split follows the data: names and ISO-3 codes are unique and validated
   so; capitals are not — Kingston is Jamaica *and* Norfolk Island, and six
   territories have no capital at all.

3. **`dialing_code` is the E.164 country calling code, and area codes are
   `area_codes`.** 3.1.8 mixed `'45'`, `'+1-268'`, `'+44-1481'` and
   `'+1-809 and 1-829'` in one string field, and `' '` for Heard Island.
   `dialing_code` is now digits only — `'1'` for Antigua — and the part that
   identifies a territory within a shared code is `area_codes`: `['268']`.
   Two consequences:

   - `'+' + c.dialing_code` gives `+1` for Antigua where it gave `++1-268`.
     To show `+1 268`, append `area_codes`.
   - `findByPhoneNbr` now tells apart every territory that shares a code and
     has an area code of its own. `'+1 809…'` is the Dominican Republic,
     which 3.1.8's `'+1-809 and 1-829'` never matched at all; `'+7 727…'` is
     Kazakhstan and `'+7 495…'` is Russia, where 3.1.8 answered both for
     either. Sint Maarten is on `+1 721`, as it has been since 2011, not
     `+599`; the Pitcairn Islands are on New Zealand's `+64`, not the
     Inmarsat `+870`; Kosovo has `+383`, Antarctica `+672 1`, South Georgia
     `+500`.

4. **`capital`, `currency` and `dialing_code` can be `undefined`.** Antarctica
   has no currency — 3.1.8 said the East Caribbean dollar — and no capital;
   six territories have no capital; three have no telephone service. Every
   such value was `''` (or `' '`, or a wrong one) and is now `undefined`, like
   every other field for a thing that does not exist. `capitals()` carries
   `undefined` in those six positions. In TypeScript, `c.currency.code` no
   longer compiles without a check.

5. **`region` and `continent` follow the UN M49 geoscheme.** 3.1.8's `region`
   was free text: `Western African` beside `Western Africa`, the Netherlands
   in `Nordic Countries`, the Cocos Islands in `Central America`, Guyana in
   the `Caribbean`. Every region is now one of M49's 23 names — `Northern
   Europe`, `Caribbean`, `Eastern Asia` — and the continent is the one M49
   puts the region in, so Cyprus moves from Europe to Asia and Timor-Leste
   from Oceania to Asia. Any code that switches on a region string will miss.

6. **Capitals are spelled with their diacritics**, as the place spells them in
   English: `Bogotá`, `Reykjavík`, `Asunción`, `Hagåtña`. `findByCapital`
   folds diacritics on a miss, so `findByCapital('Bogota')` still answers;
   what changes is the value you read back. Seventeen also changed in
   substance:

   | | was | now | |
   |---|---|---|---|
   | Ukraine | Kiev | Kyiv | the Ukrainian transliteration |
   | Burundi | Bujumbura | Gitega | political capital since 2019 |
   | Palau | Melekeok | Ngerulmud | the capital since 2006 |
   | Equatorial Guinea | Malabo | Ciudad de la Paz | the capital since January 2026 |
   | Sri Lanka | Colombo | Sri Jayawardenepura Kotte | the official capital |
   | South Georgia | Grytviken | King Edward Point | Grytviken is an abandoned whaling station |
   | Kiribati | Tarawa | South Tarawa | the capital, not the whole atoll |
   | Switzerland | Berne | Bern | English spelling |
   | Libya | Tripolis | Tripoli | English spelling |
   | Mongolia | Ulan Bator | Ulaanbaatar | English spelling |
   | Myanmar | Nay Pyi Taw | Naypyidaw | English spelling |
   | Singapore | Singapur | Singapore | English spelling |
   | Western Sahara | El-Aaiun | Laayoune | English spelling |
   | United States | Washington | Washington, D.C. | the name of the city |
   | Isle of Man | Douglas, Isle of Man | Douglas | the name of the city |
   | Guernsey | St Peter Port | Saint Peter Port | spelled out |
   | Wallis and Futuna | Mata Utu | Mata-Utu | the hyphen |

   Curaçao's capital was `' Willemstad'`, with a leading space.

7. **Nine country names are corrected**, with the old form kept as an alias or
   found by folding, so `findByName('Curacao')` still answers:

   | was | now |
   |---|---|
   | Aland Islands | Åland Islands |
   | Saint Barthelemy | Saint Barthélemy |
   | Curacao | Curaçao |
   | Reunion | Réunion |
   | Sao Tome and Principe | São Tomé and Príncipe |
   | Bonaire, Saint Eustatius and Saba␣ | Bonaire, Sint Eustatius and Saba |
   | Cocos Islands | Cocos (Keeling) Islands |
   | Pitcairn | Pitcairn Islands |
   | Palestinian Territory | Palestine |

   The Bonaire entry ended in a space. Together with the eight renames below,
   `name` is no longer pure ASCII.

8. **`currency.symbol` is the CLDR symbol.** `kr` for the Danish krone rather
   than `Dkr`, `₹` for the rupee rather than `Rs`, `₽`, `₺`, `₼`, `֏`, `৳`,
   `A$` rather than `AU$`, `CA$`, and the code where CLDR has no symbol —
   `AED`, `CHF`. 3.1.8's symbols were a mix nobody had defined.

9. **`area` is gone.** No two sources agree on what a country's area includes,
   and the figures shipped were of mixed provenance. See "deliberately not
   done".

10. **Eight countries carry the name they were renamed to**, with the former
    name kept as an alias so `findByName('Turkey')` still answers:

    | was | now | when |
    |---|---|---|
    | Turkey | Türkiye | UN accepted 2022 |
    | Swaziland | Eswatini | 2018 |
    | Macedonia | North Macedonia | 2019 |
    | Czech Republic | Czechia | 2016 |
    | Cape Verde | Cabo Verde | 2013 |
    | Ivory Coast | Côte d'Ivoire | ISO and UN form |
    | East Timor | Timor-Leste | ISO and UN form |
    | Vatican | Holy See | ISO and UN form |

    This is deliberately *not* "adopt the ISO 3166-1 short names". Those are
    inverted for indexing — Korea, Republic of; Russian Federation; Virgin
    Islands, British — and taking them wholesale would have replaced good
    display names with registry entries for about fifteen countries. Only
    genuine renames are applied.

11. **`require('country-list-js/data/names.json')` throws.** The ten aggregate
    files 3.1.8 shipped under `data/` are no longer built or published, and
    `data/` is not reachable through the exports map. Use the API.

12. **Every list is sorted by country name.** `names()`, `capitals()`, `ls()`,
    the key order of `all` and the order within any multi-country result now
    use `localeCompare(…, 'en')`. 3.1.8's order was the insertion order of a
    hand-maintained file and was stated nowhere.

13. **`cache` is no longer exported.** It was internal memoisation exposed
    because it always had been. Lookups are index reads and keep no state.

14. **`Array.prototype.unpack` and `.unique` are gone.** 3.1.8 installed them
    on a global, so requiring this package changed `Array` for the whole host
    application. Nothing in this package used them.

15. **Every subdivision carries the same four keys**: `{name, code, region,
    alias}`, null where the country has no such thing. 3.1.8 had three shapes.
    `short` is renamed `code` — it holds a subdivision code (`AL` for
    Alabama), and `short` said the opposite.

16. **An alias that is only the name without its accents is gone.** 176
    subdivision aliases and 18 country aliases were the ASCII form of the
    name — `Cordoba` for Córdoba, `Reunion` for Réunion. Lookups fold
    diacritics on a miss, so every one still resolves; what changes is that
    `alias` now lists only names that are actually different.

17. **Vietnam has 34 subdivisions, not 63**, following the merger of 1 July
    2025. The 29 that were merged away are removed rather than aliased to
    whatever absorbed them: Hà Giang is not another name for Tuyên Quang.

18. **The United Kingdom has 4 subdivisions, not 114.** The list was historic
    counties, four of which no longer exist — Avon, Cleveland and Humberside
    were abolished in 1996, Middlesex in 1965. It is now what ISO 3166-2:GB
    defines at the first tier: England, Northern Ireland, Scotland, Wales.

19. **The United States has 57 subdivisions, not 60.** The list was USPS
    postal abbreviations, which include the Federated States of Micronesia,
    the Marshall Islands and Palau because the postal service serves them.
    All three are sovereign UN member states in Compacts of Free Association
    — and this package already carries each as a country of its own. What
    remains is ISO 3166-2:US: 50 states, the District of Columbia and 6
    outlying areas.

20. **Fourteen subdivision lists were wrong.** All 31 were audited against
    ISO 3166-2. Beyond Vietnam, the United Kingdom and the United States
    above:

    | | was | now | |
    |---|---|---|---|
    | Pakistan | 31 divisions | 7 | the divisions tier was abolished in 2000, and the list still held the Federally Administered Tribal Areas, merged into Khyber Pakhtunkhwa in 2018, and the Northern Areas, renamed Gilgit-Baltistan in 2009 |
    | Cuba | 16 | 16 | four entries were **capital cities, not provinces**: Bayamo is the capital of Granma, Santa Clara of Villa Clara |
    | Ethiopia | 11 | 14 | SNNPR was dissolved on 2023-08-19; Sidama, South West Ethiopia Peoples, Central Ethiopia and South Ethiopia replace it |
    | Indonesia | 34 | 38 | Central Papua, Highland Papua, South Papua and Southwest Papua were created in 2022 |
    | Chile | 54 | 56 | Ñuble stopped being a province in 2018 and became a region: Diguillín, Itata, Punilla |
    | Spain | 48 | 50 | Cantabria and Navarra were missing — issue #27 reported Navarra and only Asturias was fixed |
    | Philippines | 82 | 83 | Compostela Valley was renamed Davao de Oro in 2019; Maguindanao split in two in 2022 |
    | Bangladesh | 7 divisions | 8 | Mymensingh Division was created in 2015 and four districts were still filed under Dhaka |
    | Italy | 106 | 107 | Sud Sardegna was created in 2016 |
    | India | 36 | 36 | two union territories merged in 2020 and were still separate; Ladakh, created 2019, was missing |
    | Nigeria | 36 | 37 | the Federal Capital Territory was missing — 36 states and no Abuja |
    | Mexico | — | — | Mexico City stopped being the Federal District in 2016 |

    Superseded names stay reachable as aliases, so `findByProvince` still
    answers for `Compostela Valley`, `Bogra`, `Chittagong` and `Northern
    Areas`. Where ISO itself lags the country, the country wins: Ethiopia
    carries fourteen regions, not the twelve ISO still lists.

    ISO 3166-2's English names were also added as aliases beside local ones,
    so `Bavaria` finds `Bayern` and `Florence` finds `Firenze`.

21. **Eight borders removed, two added.** Borders are land borders as they
    stand. Removed: India–Sri Lanka (the Palk Strait), Kuwait–Iran (the
    Gulf), Bhutan–Myanmar and South Sudan–Chad (they do not touch), Serbia–
    Albania (only Kosovo, listed separately, does), Cyprus–United Kingdom
    (Akrotiri and Dhekelia has no ISO code), France–Suriname (French Guiana,
    listed separately, carries it), and India–Afghanistan — the territory
    between them is administered by Pakistan, and a claim is not a border.
    Added: Canada–Greenland, across Hans Island since it was divided in
    2022, and Saint Martin–Sint Maarten, one island in two entries.

If none of the above touches your code, nothing else will.

### Fixed

- **`require()` threw on load.** `"AC": 247` and `"TA": 290` were merged into
  `data/phone.json` as numbers; the runtime calls `.replace()` on every dialing
  code. Only installs from git were affected — npm's 3.1.8 predates it.
- **`findByProvince` threw on the second lookup of the same province.** The
  cache stored the unpacked result and the read path called `.map` on it, which
  is not a function when a single country matched. Present in 3.1.8; the test
  suite asked for each province exactly once, so it never fired.
- **`findByPhoneNbr('+290…')` returned `[null, Saint Helena]`.** AC and TA have
  dialing codes but no country record, so they surfaced as holes in the array.
- **`findByPhoneNbr` threw a `TypeError` on any non-string.** It returns an
  empty list now.
- **Requiring this package polluted every array in your application.**
  `Array.prototype.unpack` and `.unique` were enumerable, so
  `for (const k in someArray)` yielded `'unpack'` and `'unique'` anywhere in
  the process. Both are removed; see breaking change 8.
- **`findByProvince('B')` answered Vietnam.** Three province aliases were bare
  strings rather than arrays, and `String.indexOf` is a substring search. The
  empty string matched all three.
- **Writing to a result poisoned the cache.** `findByName('Denmark').name = 'x'`
  made every later lookup of Denmark answer `'x'` for the life of the process.
  Every finder now returns a fresh object.
- **`const { names } = require('country-list-js')` threw.** The list functions
  read `this`.
- **The browser bundle defined no global.** It was built with browserify and no
  `standalone` option, so `<script src="country.min.js">` gave you nothing —
  in every released version, despite what the README said.
- **The cache grew without bound on misses.** Feeding user input to
  `findByName` added one key per distinct typo, with nothing to evict it.
  There is no cache at all now; see breaking change 7.
- **`npm test` failed before it ran.** eslint 9 does not read `.eslintrc.json`.
- **`findByIso2('constructor')` returned an object.** The indexes were plain
  objects, so a query that names an `Object.prototype` property read that
  property. `findByName('constructor')` and `findByProvince('__proto__')`
  answer nothing.

### Data corrected

Every field was audited for 4.0 against the source the README names for it.
Beyond the breaking changes above:

**Currencies.** Twelve countries carried a code ISO 4217 has retired:

| | was | now | since |
|---|---|---|---|
| Croatia | HRK | EUR | 2023 |
| Lithuania | LTL | EUR | 2015 |
| Bulgaria | BGN | EUR | 2026 |
| Venezuela | VEF | VED | 2018 (VES), then 2021 |
| Mauritania | MRO | MRU | 2018 |
| São Tomé and Príncipe | STD | STN | 2018 |
| Sierra Leone | SLL | SLE | 2022 |
| Zimbabwe | ZWL | ZWG | 2024 |
| Zambia | ZMK | ZMW | 2013 |
| Curaçao | ANG | XCG | 2025 |
| Sint Maarten | ANG | XCG | 2025 |

Belarus is BYN rather than BYR. That fix has been on `master` since before the
v3.1.8 tag, but the tag was cut off `master` and published a tree where it had
been reverted.

**Retired codes still resolve.** `findByCurrency('HRK')` answers Croatia — not
undefined, and not all 37 euro countries — and `ANG` answers Curaçao and Sint
Maarten.

**Languages.** Serbia's was `rs`, which is not a language code; it is `sr`.
Aruba's `pa` was Punjabi; it is `pap`, Papiamento. Fiji had Hindi and Urdu
for Fiji Hindi, `hif`. Malaysia and eleven territories had none. Every list
is now the languages official for the whole country: Romansh joins
Switzerland's, Swahili joins Rwanda's, Afar, Oromo, Somali and Tigrinya join
Amharic for Ethiopia, and regional co-official languages come off — Spain is
`es`, Peru is `es`.

**Native names.** Sri Lanka's was a romanisation, `śrī laṃkāva`; it is now
`ශ්‍රී ලංකාව / இலங்கை`. Myanmar's was cut off mid-word. Belarus's carried a
stress mark, Bahrain's and Libya's an invisible right-to-left mark, Egypt's a
left-to-right one. Hungary's was `Magyarorszag`. Cambodia's was a
romanisation. Jamaica's was Patois, which is not official. Every one is now
the short name in the country's official languages.

**Demonyms.** `Argentinean` is `Argentine`, `Kirghiz` is `Kyrgyzstani`,
`Maldivan` is `Maldivian`, `Surinamer` is `Surinamese`, `Djibouti` and
`Gibraltar` are `Djiboutian` and `Gibraltarian`, Hong Kong's and Macao's are
`Hongkonger` and `Macanese` rather than `Chinese`, and the British Indian
Ocean Territory's is no longer `Indian`. Thirteen territories that had none
have one.

**Top-level domains.** Afghanistan carried `.افغانستان`, which was never
delegated; Heard Island carried `.aq`, which is Antarctica's. Forty-two
internationalized domains that are delegated were missing — `.рф`, `.中国`,
`.한국`, `.भारत`. Thirteen territories had none.

**Coordinates** for the thirteen territories that had none.

Vietnam's provinces are updated (PR #74) and then replaced wholesale by the
34 units in force since 1 July 2025; see breaking change 17.

### Added

Every country record gains these. All are additive; no existing field changed.

- `borders` — ISO-2 neighbours, symmetric
- `timezones` — IANA identifiers, from the tz database
- `code.numeric` — ISO 3166-1 numeric
- `area_codes` — the area codes that identify a territory within a shared
  calling code
- `native_name`, `demonym`, `languages`, `tld`, `latlng`

Also:

- **662 name aliases.** `findByName` accepts `Türkiye`, `Eswatini`, `Czechia`,
  `Cabo Verde`, `North Macedonia`, `Timor-Leste`, `Holy See`, `USA`, `UK`,
  `Danmark`, `Deutschland` and more.
- **Case- and diacritic-insensitive lookup.** The README has claimed
  case-insensitive search since 3.1.0 and it was never true. Exact matching
  runs first and still wins; the fallback folds case and Latin diacritics and
  only turns an `undefined` into a hit — `findByCapital('Bogota')`,
  `findByProvince('Sao Paulo')`, `findByName('Cote d’Ivoire')`.
- **Real TypeScript types.** Every signature was `any`. `Iso2`, `Iso3` and
  `CurrencyCode` are literal unions generated from the data, so your editor
  autocompletes all 250 codes and a typo is a compile error.
- **ESM**, via `import` — named exports included. It shares one runtime with
  the CommonJS build, so `all` is the same object either way.
- **A browser bundle that works**, at the same `dist/country.min.js` path, with
  `unpkg` and `jsdelivr` fields. It assigns `window.country`.
- `code` and `region` on every subdivision, filled where the country has
  them.

### Changed

- **Zero runtime dependencies.** `micro` was a dependency for `server.js`, the
  Now/Vercel demo that has answered 404 since 2021 (#25). Both are gone.
- Country data is now one file per country under `catalog/countries/`,
  validated against a JSON schema. Everything under `data/` is generated from
  it and is private to the runtime.
- Lookups go through indexes instead of scanning all 250 records, and every
  result is built fresh, so a caller writing to one cannot affect another.
- **The subdivision data is described accurately for the first time.** It was
  documented as first-tier only, which is false for seven of the countries
  checked against ISO 3166-2 — Spain carries 50 provinces where ISO's first
  tier is 17 autonomous communities and 2 autonomous cities, Peru 196 against
  26. The README now says which
  countries sit where, and that the completeness of a list is unwarranted
  except where this changelog says otherwise.
- The stale browser bundle is no longer committed to the repository. Build
  outputs are generated at publish time.

### Closed

#8 (borders), #9 and #28 (subdivision metadata — normalised shape, `code` and
`region`; a per-subdivision ISO 3166-2 category is *not* included, see below),
#17 (time zones), #25 (dead API), #60 (naming standard), #84 (Bulgaria),
PR #74 (Vietnam).

### Deliberately not done

**An `area` field.** It was imported for 4.0 and then removed. Every source
defines area differently — Hong Kong is 1,104 km² of land or 2,755 km² with
its waters, Puerto Rico 8,870 or 13,792, Serbia 77,589 or 88,499 depending on
Kosovo — and the CIA World Factbook, the one public-domain source that used a
single definition, was discontinued. A number nobody can check against a
stated source is not data.

**A per-subdivision category label** (`state`, `province`, `union
territory`). ISO 3166-2's own category is the right value and is not available
in a form that can be trusted unattended: Wikidata, the only machine-readable
CC0 source, returns 43 rows for India's 36 subdivisions, including withdrawn
codes presented as current, duplicate rows per code, and classifications such
as "ISO standard" and "globe". Shipping that would put abolished subdivisions
behind an authoritative-looking field — the exact defect corrected here in GB
and VN. An accurate description and no field beats a field that is right most
of the time.

---

## 3.1.8 and earlier

See the [commit history](https://github.com/i-rocky/country-list-js/commits/master).
