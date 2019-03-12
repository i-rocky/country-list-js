"use strict";

import {expect} from 'chai';
import country from "./../src/index";
import { ok } from 'assert';

describe('Country', () => {
    it('There has to be total of 250 countries', () => {
        expect(Object.keys(country.all).length).to.be.equal(250);
    });

    it('Find by iso alpha 2', function() {
        validate_result(country.findByIso2('BD'));
    });

    it('Find by iso alpha 3', function () {
        validate_result(country.findByIso3('BGD'));
    });

    it('Find by Name', function () {
        validate_result(country.findByName('Bangladesh'));
    });

    it('Find by capital', function () {
        validate_result(country.findByCapital('Dhaka'));
    });
    it('Find by currency', function () {
        validate_result(country.findByCurrency('BDT'));
    });
    it('find by phone number', function() {
        validate_result(country.findByPhoneNbr('+8805551212'));
    });

    function validate_result(info) {
        expect(Object.keys(info).length).to.be.equal(7);

        expect(info).to.deep.equal({
            code: {
                iso_alpha_2: "BD",
                iso_alpha_3: "BGD"
            },
            name: "Bangladesh",
            continent: "Asia",
            region: "Southern Asia",
            capital: "Dhaka",
            currency: {
                code: "BDT",
                symbol: "Tk",
                decimal: "2"
            },
            dialing_code: "880"
        });
    }

    it('Once the search has been made, the data is cached', function () {
        ok('BGD' in country.cache.iso3, 'ISO3 cache failed');
        ok('Bangladesh' in country.cache.name, 'Country name cache failed');
        ok('Dhaka' in country.cache.capital, 'Capital cache failed');
        ok('BDT' in country.cache.currency, 'Currency cache failed');
    });

    it('null is returned if not found', function () {
        expect(country.findByIso2('XX')).to.be.equal(undefined);
        expect(country.findByIso3('XX')).to.be.equal(undefined);
        expect(country.findByName('XX')).to.be.equal(undefined);
        expect(country.findByCapital('XX')).to.be.equal(undefined);
        expect(country.findByCurrency('XX')).to.be.equal(undefined);
        console.log(country.findByPhoneNbr('XX'))
        expect(country.findByPhoneNbr('XX')).to.be.equal(undefined);
    });
});