## Country List JS

[![Build Status](https://travis-ci.org/i-rocky/country-list-js.svg?branch=master)](https://travis-ci.org/i-rocky/country-list-js) [![Version](https://img.shields.io/npm/v/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![Total Downloads](https://img.shields.io/npm/dt/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![License](https://img.shields.io/github/license/i-rocky/country-list-js.svg)](https://github.com/i-rocky/country-list-js/blob/master/LICENSE)

## Installation

```html
<script src="/path/to/country.min.js"></script>
```

or

```
npm install --save country-list-js
```
## Basic Usage
In CommonJs envrionments, require as usual:
```javascript 
var country = require('country-list-js'); 
```

#### Searching
Searches can be conducted by any of the following methods:
```javascript
var found = country.findByIso2('BD');
var found = country.findByIso3('BGD');
var found = country.findByName('Bangladesh');
var found = country.findByCapital('Dakha');
var found = country.findByCurrency('BDT');
var found = country.findByPhoneNbr('+8804005050');
```

Note: Search queries are case insensitive.

If the country cannot be found, the return value is  ```undefined```.
The return value of all of those above will be similar to the following

```javascript
{
    continent: "Asia",
    region: "Southern Asia",
    name: "Bangladesh",
    code: {
        iso_alpha_2: "BD",
        iso_alpha_3: "BGD"
    },
    capital: "Dhaka",
    currency: {
        code: "BDT",
        symbol: "Tk",
        decimal: "2"
    },
    dialing_code: "880"
}
```

Queries are cached so only the first time a country is searched by requires traversal
of the internal structures and thus calls will resolve very quickly.

## NPM Commands

The built-in test suite may be run in the traditional way
```
npm run test
```

and to build the project:
```
npm run build
```