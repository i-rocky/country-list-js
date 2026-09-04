# Contributing

Thanks for helping keep this data correct.

## Fixing country data

**Everything starts and ends in `catalog/countries/<ISO2>.json`.** One file per
country. Editing Bulgaria's currency is a one-line diff:

```diff
  "capital": "Sofia",
- "currency": "BGN",
+ "currency": "EUR",
```

Everything under `data/` is **generated** from those files by
`scripts/build-data.js`. Don't edit it; your change would be overwritten on
the next build, and the diff would be unreadable anyway.

The other sources are:

| path | holds |
|---|---|
| `catalog/countries/<ISO2>.json` | one country |
| `catalog/reference/currencies.json` | currency code → CLDR symbol and ISO 4217 minor unit |
| `catalog/reference/continents.json` | continent code → name |
| `catalog/reference/name-aliases.json` | alternative country names |
| `catalog/reference/retired-currencies.json` | ISO 4217 codes that no longer exist, and what replaced them |
| `catalog/country.schema.json` | what a country file may contain |

Everything a caller can observe -- `names()`, `capitals()`, `ls()`, the key
order of `all`, and the order of any multi-country result -- comes out sorted
by country name, with `localeCompare(name, 'en')`. Nothing maintains that
order: adding a country is one new file and nothing else.

## Before you open a pull request

```sh
npm install     # installs, and builds data/
npm test        # lint, typecheck, validate the data, run the suite
```

Each step is runnable on its own: `npm run lint`, `npm run typecheck`,
`npm run validate`, `npm run test:unit`.

`npm run validate` runs `scripts/validate-data.js`, which checks rather more
than the schema can: that the filename matches `iso2`, that ISO-3 and numeric
codes are unique, that currencies and continents resolve, that borders are
symmetric, that time zones are real IANA identifiers, and that every field the
runtime calls a string method on really is a string.

That last rule exists for a reason. Merging `"AC": 247` unquoted — a number
where a string belonged — made `require('country-list-js')` throw on load, and
the break sat on `master` for nearly two years because nothing checked.

## Some rules the data follows

The README's "Notes on the data" says what each field means and where it
comes from. When you change a value, change it to what that source says, and
say which source in the commit.

- **Names** are the current common short name in English, spelled as the
  place spells it. When a country is renamed, change `name` and add the former
  name to `catalog/reference/name-aliases.json` in the same commit -- an alias
  only ever turns a lookup that answered nothing into a hit, so nobody using
  the old name loses anything. Native and official long forms go in the alias
  file too, never in `name`. Don't add the ASCII form of an accented name as
  an alias: lookups fold diacritics, so it already resolves.
- **A value that does not exist is absent**, never `''`, `null` or `' '`.
  Antarctica has no `capital` and no `currency`; Bouvet Island has no
  `dialing_code`.
- **`region` is a UN M49 name**, and `continent` the continent M49 places it
  in. The schema lists the 23 regions; a value outside them fails validation.
- **`dialing_code` is digits only**, the E.164 country calling code without
  the plus. What identifies a territory within a shared code goes in
  `area_codes`: Antigua is `"1"` with `["268"]`, never `"+1-268"`.
- **A subdivision carries all four keys** -- `name`, `code`, `region`,
  `alias` -- with `null` where the country has no such thing.
- **An alias is a list or `null`.** Never a bare string: `indexOf` on a
  string is a substring search, and three of these once made
  `findByProvince('B')` answer Vietnam.
- **Borders are land borders as they stand, and symmetric.** If you add
  A → B, add B → A. A claim is not a border.
- **A retired currency goes in `retired-currencies.json`** with its successor
  and the date, and comes out of `currencies.json`. Its code keeps resolving.
- **Don't add `area` or `population`.** No two sources agree on what an area
  includes, and population changes every year; neither can be kept correct.

## Changing behaviour

The public API is frozen. `test/contract.js` diffs this package against the
real, published 3.1.8 for all 250 countries and 42 recorded calls, and it fails
on any difference that is not declared in that file with a reason. It also fails
if a declared difference turns out to be identical, so the list cannot go
stale.

If your change moves observable behaviour, declare it there and say why. If you
cannot justify it, it probably should not change: 15,000 installs a week depend
on this behaving the way it always has.

## Releasing

Work happens on `v4.x`. Merging `v4.x` into `master` triggers the release:
CI runs the suite, packs the tarball, installs it into a throwaway project
beside the published 3.1.8, and runs every check against the *installed*
package before publishing. A broken `exports` map or a missing file fails there
rather than on npm.
