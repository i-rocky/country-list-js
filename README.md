# Country List JS

[![npm version](https://badge.fury.io/js/country-list-js.svg)](https://badge.fury.io/js/country-list-js)
[![Build Status](https://travis-ci.org/i-rocky/country-list-js.svg?branch=master)](https://travis-ci.org/i-rocky/country-list-js) [![Version](https://img.shields.io/npm/v/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![Total Downloads](https://img.shields.io/npm/dt/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![License](https://img.shields.io/github/license/i-rocky/country-list-js.svg)](https://github.com/i-rocky/country-list-js/blob/master/LICENSE)

This module contains country information including 2 and 3 character ISO codes, country and capital names,
currency information, telephone calling codes, and provinces (first-tier political subdivisions)

The functionality in this package is also available as a service, hosted on the Now platform.  This modality
lends itself well to microservice architectures.  For more information please see the section on *Now* at
the end of this document

## Install
Add to your project from the NPM repository:
```
npm install --save country-list-js
```
And get an instance of the module:
```javascript
// using ES6 modules

import country from 'country-list-js';

// using CommonJS modules
var country = require('country-list-js'); 
```
In a web page, you can include the modulelike this:
```html
<script src="/path/to/country.min.js"></script>
```

## Basic Usage

The following methods are available:

### Listing
Lists can be generated using the following convenience functions:
```js
var country_names = country.names();
var continents = country.continents();
var capitals = country.capitals();
```
but, in general, any of a country's attributes can be retrieved using
the `ls` method, which can also produce the above:
```js
var country_names = country.ls('name');
var continents = country.ls('continent');
var capitals = country.ls('capital');
```

### Searching
Searches can be conducted by any of the following methods:

```javascript
var found = country.findByIso2('BD');
var found = country.findByIso3('BGD');
var found = country.findByName('Bangladesh');
var found = country.findByCapital('Dakha');
var found = country.findByCurrency('BDT');
var found = country.findByPhoneNbr('+8804005050');
var found = country.findByProvince('Steiermark');
```

If the country cannot be found, the return value is  `undefined`.
If a single value is found, it is returned as an object similar to the
one shown below, and if multiple matches are made, an array of such
objects is returned

```javascript
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
        { name: 'Sjælland', alias: [ 'Zealand' ] },
        { name: 'Syddanmark', alias: null }
    ],
    code: { iso_alpha_2: 'DK', iso_alpha_3: 'DNK' } 
}
```

## Notes

* Queries are cached so only the first time a country is searched by requires traversal
of the internal structures and thus calls will resolve very quickly

* Search queries are case insensitive

* Province searches include aliases so you may search for either ***Sjælland*** or ***Zealand***

## NPM Commands

The built-in test suite may be run in the traditional way
```
npm test
```

and to build the minified file for web, run:
```
npm run build
```
and retrieve the file from `dist/country.min.js`

## Module-as-a-service on the Now platform

The functionality in this module is also available via a REST API where any methods 
may be called by passing parameters to the service's url.  The parameter "method" is
used to indicate which method to call, and additional parameters should match the
signature of the method, for example:
```bash
curl "https://country-list-js.npm.now.sh/server.js?method=findByIso2&code=DK"
```
returns a JSON object with information for Denmark.  In Javascript you may use your fevourite
package for fetching instead:
```js
const fetch = require('node-fetch')
const url = 'https://country-list-js.npm.now.sh/server.js?method=findByIso2&code=DK'
fetch(url).then(res => res.json())
    .then(o => {
        console.log(o)  // will show Denmark
    })
```

## Licence

MIT