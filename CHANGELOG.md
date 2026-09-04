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

Fourteen of them, ordered by how likely they are to bite. The first is the only
one that fails quietly.

1. **`currency.decimal` is a number.** It was the string `'2'`; it is now `2`.
   Code doing `c.currency.decimal === '2'` now always misses, silently. Code
   doing `parseInt(...)` is unaffected.

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

3. **`findByPhoneNbr` answers on the most specific prefix.** `'+1246…'` is
   `[Barbados]`, where 3.1.8 returned Barbados, the U.S. Minor Outlying
   Islands, the United States and Canada and left you to know the first
   element was the specific one. Codes genuinely shared at one length still
   return every holder, so `'+1…'` is still three territories. The
   `{longestMatch: true}` option is gone with the behaviour it selected.

4. **`require('country-list-js/data/names.json')` throws.** The ten aggregate
   files 3.1.8 shipped under `data/` are no longer built or published, and
   `data/` is not reachable through the exports map. Use the API.

5. **Eight countries carry the name they were renamed to**, with the former
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

   `name` is therefore no longer pure ASCII. Capitals still are.

   This is deliberately *not* "adopt the ISO 3166-1 short names". Those are
   inverted for indexing — Korea, Republic of; Russian Federation; Virgin
   Islands, British — and taking them wholesale would have replaced good
   display names with registry entries for about fifteen countries. Only
   genuine renames are applied.

6. **Every list is sorted by country name.** `names()`, `capitals()`, `ls()`,
   the key order of `all` and the order within any multi-country result now
   use `localeCompare(…, 'en')`. 3.1.8's order was the insertion order of a
   hand-maintained file and was stated nowhere.

7. **`cache` is no longer exported.** It was internal memoisation exposed
   because it always had been. Lookups are index reads and keep no state.

8. **`Array.prototype.unpack` and `.unique` are gone.** 3.1.8 installed them
   on a global, so requiring this package changed `Array` for the whole host
   application. Nothing in this package used them.

9. **Every subdivision carries the same four keys**: `{name, code, region,
   alias}`, null where the country has no such thing. 3.1.8 had three shapes.
   `short` is renamed `code` — it holds a subdivision code (`AL` for
   Alabama), and `short` said the opposite.

10. **Vietnam has 34 subdivisions, not 63**, following the merger of 1 July
    2025. The 29 that were merged away are removed rather than aliased to
    whatever absorbed them: Hà Giang is not another name for Tuyên Quang.

11. **The United Kingdom has 4 subdivisions, not 114.** The list was historic
    counties, four of which no longer exist — Avon, Cleveland and Humberside
    were abolished in 1996, Middlesex in 1965. It is now what ISO 3166-2:GB
    defines at the first tier: England, Northern Ireland, Scotland, Wales.

12. **The United States has 57 subdivisions, not 60.** The list was USPS
    postal abbreviations, which include the Federated States of Micronesia,
    the Marshall Islands and Palau because the postal service serves them.
    All three are sovereign UN member states in Compacts of Free Association
    — and this package already carries each as a country of its own. What
    remains is ISO 3166-2:US: 50 states, the District of Columbia and 6
    outlying areas.

13. **Fourteen subdivision lists were wrong.** All 31 were audited against
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
    so `Bavaria` finds `Bayern` and `Florence` finds `Firenze`. Nothing was
    removed: the ASCII transliterations callers type — `Camaguey`, `Mugla`,
    `Michoacan` — are untouched.

14. **Two borders removed.** India–Sri Lanka is the Palk Strait, a maritime
    boundary, so Sri Lanka now correctly has none. France–Suriname duplicated
    French Guiana, which is a separate entry carrying its own `BR` and `SR`
    — and the inconsistency showed, because France was never listed as
    bordering Brazil on the same ground.

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

### Data corrected

Nine countries carried a currency ISO 4217 has retired:

| | was | now | since |
|---|---|---|---|
| Croatia | HRK | EUR | 2023 |
| Lithuania | LTL | EUR | 2015 |
| Bulgaria | BGN | EUR | 2026 |
| Venezuela | VEF | VES | 2018 |
| Mauritania | MRO | MRU | 2018 |
| São Tomé and Príncipe | STD | STN | 2018 |
| Sierra Leone | SLL | SLE | 2022 |
| Zimbabwe | ZWL | ZWG | 2024 |
| Zambia | ZMK | ZMW | 2013 |

Belarus is BYN rather than BYR. That fix has been on `master` since before the
v3.1.8 tag, but the tag was cut off `master` and published a tree where it had
been reverted.

**Retired codes still resolve.** `findByCurrency('HRK')` answers Croatia — not
undefined, and not all 37 euro countries.

Vietnam's provinces are updated (PR #74) and then replaced wholesale by the
34 units in force since 1 July 2025; see breaking change 10.

### Added

Every country record gains these. All are additive; no existing field changed.

- `borders` — ISO-2 neighbours, symmetric
- `timezones` — IANA identifiers, from the tz database
- `code.numeric` — ISO 3166-1 numeric
- `native_name`, `demonym`, `languages`, `tld`, `area`, `latlng`

Also:

- **682 name aliases.** `findByName` accepts `Türkiye`, `Eswatini`, `Czechia`,
  `Cabo Verde`, `North Macedonia`, `Timor-Leste`, `Holy See`, `USA`, `UK`,
  `Danmark`, `Deutschland` and more. The `name` field itself is unchanged.
- **Case-insensitive lookup**, which the README has claimed since 3.1.0 and
  which was never true. Exact matching runs first and still wins; the fallback
  only turns an `undefined` into a hit.
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
  documented as first-tier only, which is false for six of the countries
  checked against ISO 3166-2 — Spain carries 48 provinces where ISO defines 19
  autonomous communities, Peru 196 against 26. The README now says which
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
