"use strict";

import continents from '../data/continents';
import continent from '../data/continent';
import iso_alpha_3 from '../data/iso_alpha_3';
import capital from '../data/capital';
import currency from '../data/currency';
import names from '../data/names';
import phone from '../data/phone';

function Country() {
    let countryInfo = null;

    this.FIND_BY_ISO_ALPHA_2 = 1;
    this.FIND_BY_ISO_ALPHA_3 = 2;
    this.FIND_BY_NAME = 3;
    this.FIND_BY_CAPITAL = 4;
    this.FIND_BY_CURRENCY = 5;

    /**
     * Looks up the needle according to flag and returns found result
     * 
     * @param needle
     * @param flag
     * @returns {*}
     */
    this.find = function (needle, flag = 1) {
        switch (parseInt(flag)) {
            case this.FIND_BY_ISO_ALPHA_2:
                if(needle===null || needle===undefined) {
                    countryInfo = null;
                    return null;
                }
                countryInfo = pullDataForCountry(needle);
                return countryInfo;
                break;
            case this.FIND_BY_ISO_ALPHA_3:
                return findByISO_ALPHA_3(needle);
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
        switch (hook) {
            case "iso_alpha_2":
                return countryInfo.code.iso_alpha_2;
                break;
            case "iso_alpha_3":
                return countryInfo.code.iso_alpha_3;
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

    /**
     * Populates country data
     * 
     * @param code
     * @returns {*}
     */
    function pullDataForCountry(code) {
        if(names[code]===undefined)
            return null;
        return {
            continent: continents[continent[code]],
            name: names[code],
            code: {
                iso_alpha_2: code,
                iso_alpha_3: iso_alpha_3[code]
            },
            capital: capital[code],
            currency: currency[code],
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

global.Country = Country;
module.exports = Country;
