"use strict";

import continents from '../data/continents';
import continent from '../data/continent';
import iso3 from '../data/iso3';
import capital from '../data/capital';
import currency from '../data/currency';
import names from '../data/names';
import phone from '../data/phone';

function Country() {
    let countryInfo = null;

    this.FIND_BY_ISO2 = 1;
    this.FIND_BY_ISO3 = 2;
    this.FIND_BY_NAME = 3;
    this.FIND_BY_CAPITAL = 4;
    this.FIND_BY_CURRENCY = 5;

    this.find = function (needle, flag = 1) {
        switch (parseInt(flag)) {
            case this.FIND_BY_ISO2:
                if(needle===null || needle===undefined) {
                    countryInfo = null;
                    return null;
                }
                countryInfo = pullDataForCountry(needle);
                return countryInfo;
                break;
            case this.FIND_BY_ISO3:
                return findByISO3(needle);
                break;
            case this.FIND_BY_NAME:
                return findByName(needle);
                break;
            case this.FIND_BY_CAPITAL:
                return findByCapital(needle);
                break;
            case this.FIND_BY_CURRENCY:
                return findByCurrency(needle);
                break;
            default:
                countryInfo = pullDataForCountry(needle);
                return countryInfo;
        }
    };

    this.info = function (hook=null) {
        if(countryInfo===null) {
            return null;
        }
        switch (hook) {
            case "iso2":
                return countryInfo.code.iso2;
                break;
            case "iso3":
                return countryInfo.code.iso3;
                break;
            case "name":
                return countryInfo.name;
                break;
            case "continent":
                return countryInfo.continent;
                break;
            case "capital":
                return countryInfo.capital;
            case "currency":
                return countryInfo.currency;
                break;
            case "dialing_code":
                return countryInfo.dialing_code;
                break;
            default:
                return countryInfo;
        }
    };

    function pullDataForCountry(code) {
        if(names[code]===undefined)
            return null;
        return {
            name: names[code],
            code: {
                iso2: code,
                iso3: iso3[code]
            },
            continent: continents[continent[code]],
            capital: capital[code],
            currency: currency[code],
            dialing_code: phone[code]
        };
    }
    function findByISO3(needle) {
        return findInObject(iso3, needle);
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

    function findInObject(obj, needle) {
        for(const key in obj) {
            if(obj.hasOwnProperty(key)) {
                if(obj[key].toLowerCase()===needle.toLowerCase()) {
                    countryInfo = pullDataForCountry(key);
                    return countryInfo;
                }
            }
        }
        countryInfo = null;
        return countryInfo;
    }
}

global.Country = Country;
module.exports = Country;
