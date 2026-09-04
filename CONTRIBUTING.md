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
| `catalog/reference/currencies.json` | currency code → symbol and minor unit |
| `catalog/reference/continents.json` | continent code → name |
| `catalog/reference/name-aliases.json` | alternative country names |
| `catalog/reference/retired-currencies.json` | ISO 4217 codes that no longer exist |
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

- **Names** are the current common short name in English. When a country is
  renamed, change `name` and add the former name to
  `catalog/reference/name-aliases.json` in the same commit -- an alias only
  ever turns a lookup that answered nothing into a hit, so nobody using the
  old name loses anything. Native and official long forms go in the alias
  file too, never in `name`.
- **A subdivision carries all four keys** -- `name`, `code`, `region`,
  `alias` -- with `null` where the country has no such thing.
- **An alias is a list or `null`.** Never a bare string: `indexOf` on a
  string is a substring search, and three of these once made
  `findByProvince('B')` answer Vietnam.
- **Borders are symmetric.** If you add A → B, add B → A.
- **Dialing codes are strings**, even when they look like numbers.
- **Don't add `population`.** It changes every year and there is no way to keep
  250 figures current.

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
