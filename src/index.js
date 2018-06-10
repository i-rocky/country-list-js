"use strict";

const continents = require('./../data/continents.json');
const continent = require('../data/continent.json');
const iso_alpha_3 = require('../data/iso_alpha_3.json');
const capital = require('../data/capital.json');
const currency = require('../data/currency.json');
const currency_info = require('../data/currency_info.json');
const names = require('../data/names.json');
const phone = require('../data/phone.json');

function Country () {
    let countryInfo = null;

    this.FIND_BY_ISO_ALPHA_2 = 1;
    this.FIND_BY_ISO_ALPHA_3 = 2;
    this.FIND_BY_NAME = 3;
    this.FIND_BY_CAPITAL = 4;
    this.FIND_BY_CURRENCY = 5;

    this.all = function () {
        const all = [];
        for(const key in names) {
            if(names.hasOwnProperty(key)) {
                all.push(pullDataForCountry(key));
            }
        }
        return all;
    };

    /**
     * Looks up the needle according to flag and returns found result
     *
     * @param needle
     * @param flag
     * @returns {*}
     */
    this.find = function (needle, flag = 1) {
        let number = parseInt(flag);
        if (number === this.FIND_BY_ISO_ALPHA_2) {
            if (needle === null || needle === undefined) {
                countryInfo = null;
                return null;
            }
            countryInfo = pullDataForCountry(needle);
            return countryInfo;
        } else if (number === this.FIND_BY_ISO_ALPHA_3) {
            return findByISO_ALPHA_3(needle);
        } else if (number === this.FIND_BY_NAME) {
            return findByName(needle);
        } else if (number === this.FIND_BY_CAPITAL) {
            return findByCapital(needle);
        } else if (number === this.FIND_BY_CURRENCY) {
            return findByCurrency(needle);
        } else {
            countryInfo = pullDataForCountry(needle);
            return countryInfo;
        }
    };

    /**
     * Pulls data from previous result
     *
     * @param hook
     * @returns {*}
     */
    this.info = function (hook=null) {
        if(countryInfo===null) {
            return null;
        }
        if (hook === "iso_alpha_2") {
            return countryInfo.code.iso_alpha_2;
        } else if (hook === "iso_alpha_3") {
            return countryInfo.code.iso_alpha_3;
        } else if (hook === "name") {
            return countryInfo.name;
        } else if (hook === "continent") {
            return countryInfo.continent;
        } else if (hook === "capital") {
            return countryInfo.capital;
        } else if (hook === "currency") {
            return countryInfo.currency;
        } else if (hook === "dialing_code") {
            return countryInfo.dialing_code;
        } else {
            return countryInfo;
        }
    };

    /**
     * Populates country data
     *
     * @param code
     * @returns {*}
     */
    function pullDataForCountry(code) {
        if(names[code]===undefined)
            return null;
        const currencyInfo = currency_info[currency[code]];
        return {
            continent: continents[continent[code]],
            name: names[code],
            code: {
                iso_alpha_2: code,
                iso_alpha_3: iso_alpha_3[code]
            },
            capital: capital[code],
            currency: {
                code: currency[code],
                symbol: currencyInfo.symbol,
                decimal: currencyInfo.decimal
            },
            dialing_code: phone[code]
        };
    }

    function findByISO_ALPHA_3(needle) {
        return findInObject(iso_alpha_3, needle);
    }
    function findByName(needle) {
        return findInObject(names, needle);
    }
    function findByCapital(needle) {
        return findInObject(capital, needle);
    }
    function findByCurrency(needle) {
        return findInObject(currency, needle);
    }

    /**
     * Finds for a needle in haystack
     *
     * @param haystack
     * @param needle
     * @returns {*}
     */
    function findInObject(haystack, needle) {
        for(const key in haystack) {
            if(haystack.hasOwnProperty(key)) {
                //check if we have a match
                if(haystack[key].toLowerCase()===needle.toLowerCase()) {
                    countryInfo = pullDataForCountry(key);
                    return countryInfo;
                }
            }
        }
        countryInfo = null;
        return countryInfo;
    }
}

module.exports = Country;