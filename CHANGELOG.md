# Changelog

## 4.0.0

The last release was 3.1.8, in October 2023. `master` has been broken since
shortly after: `require('country-list-js')` threw on load, so nothing could be
published.

**Nothing that worked in 3.1.8 stops working.** The thirteen exported members,
the shape of a country record, the values of every existing field, and every
deep import path are unchanged, and a test suite diffs this release against the
real published 3.1.8 to prove it. The major version reflects an internal
rewrite and the corrected data, not a moved API.

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
- **`findByPhoneNbr` threw a `TypeError` on any non-string.** It returns
  `undefined` now, like every other finder.
- **Requiring this package polluted every array in your application.**
  `Array.prototype.unpack` and `.unique` were enumerable, so
  `for (const k in someArray)` yielded `'unpack'` and `'unique'` anywhere in the
  process. They are still installed, and still work, but are no longer
  enumerable.
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
  Only hits are cached now.
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

Vietnam's provinces are updated (PR #74), with the previous names kept as
aliases.

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
  the CommonJS build, so `all` and `cache` are the same objects either way.
- **A browser bundle that works**, at the same `dist/country.min.js` path, with
  `unpkg` and `jsdelivr` fields. It assigns `window.country`.
- `findByPhoneNbr(nbr, {longestMatch: true})` narrows `'+1246…'` to Barbados
  alone. The default is unchanged.

### Changed

- **Zero runtime dependencies.** `micro` was a dependency for `server.js`, the
  Now/Vercel demo that has answered 404 since 2021 (#25). Both are gone.
- Country data is now one file per country under `catalog/countries/`,
  validated against a JSON schema. Everything under `data/` is generated from
  it and still ships unchanged.
- Lookups go through indexes instead of scanning all 250 records. Repeat
  lookups of the same value do a little more work than before, because a fresh
  object is built rather than a shared one handed back — which is what stops a
  caller writing to a result and poisoning the cache.
- The stale browser bundle is no longer committed to the repository. Build
  outputs are generated at publish time.

### Closed

#8 (borders), #17 (time zones), #25 (dead API), #60 (naming standard),
#84 (Bulgaria), PR #74 (Vietnam).

---

## 3.1.8 and earlier

See the [commit history](https://github.com/i-rocky/country-list-js/commits/master).
