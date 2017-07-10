## Country List JS

> https://i-rocky.github.io/country-list-js/
> https://www.npmjs.com/package/country-list-js

## Installation

```html
<script src="/path/to/country.min.js"></script>
```

or

```
npm install country-list-js
```
## Basic Usage
#### Instantiation

```javascript 
var country = new Country; 
```

#### Searching

```javascript
var found = country.find('BD', country.FIND_BY_ISO_ALPHA_2);
var found = country.find('BGD', country.FIND_BY_ISO_ALPHA_3);
var found = country.find('Bangladesh', country.FIND_BY_NAME);
var found = country.find('Capital', country.FIND_BY_CAPITAL);
var found = country.find('BDT', country.FIND_BY_CURRENCY);
```

The search option can also be hard coded as following

```javascript
country.FIND_BY_ALPHA_2 = 1
country.FIND_BY_ALPHA_3 = 2
country.FIND_BY_NAME = 3
country.FIND_BY_CAPITAL = 4
country.FIND_BY_CURRENCY = 5
```

```country.find('BD', country.FIND_BY_ISO_ALPHA_2);``` can be written as ```country.find('BD', 1);```

If the country was not found, the variable ```found``` will be ```null.
The return value of all of those above will be similar to the following

```javascript
{
    continent: "Asia",
    name: "Bangladesh",
    code: {
        iso_alpha_2: "BD",
        iso_alpha_3: "BGD"
    },
    capital: "Dhaka",
    currency: "BDT",
    dialing_code: "880"
}
```

Once the search has been made, if the country was found, the information is stored in the instance. We can retrieve the information without having to search again.

```javascript
var found = country.info();
var name = country.info('name'); //Bangladesh
var iso_alpha_2 = country.info('iso_alpha_2'); //BD
var iso_alpha_3 = country.info('iso_alpha_3'); //BGD
var continent = country.info('continent'); //Asia
var capital = country.info('capital'); //Dhaka
var currency = country.info('currency'); //BDT
var dialing_code = country.info('dialing_code'); //880
```

### npm commands

##### Test
```
npm run test
```

##### Build
```
npm run build
```