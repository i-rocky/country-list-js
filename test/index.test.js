"use strict";

const expect = require('chai').expect;
const ok = require('assert').ok;

// this prototype tests that property loops in the
// module are safe.  the prototype must be installed
// before the module is required

Object.prototype.__test_function__ = () => null;

// require the module

const country = require('../src/index')

describe('Country', () => {
    var DK = { 
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
        code: { iso2: 'DK', iso3: 'DNK' } 
    };

    it('There has to be total of 250 countries', () => {
        expect(Object.keys(country.all).length).to.be.equal(250);
    });
    it('There must be 8 keys in the object', () => {
        expect(Object.keys(country.findByIso2('DK')).length).to.be.equal(8);
    });
    it('Find by iso alpha 2', function() {
        var actual = country.findByIso2('DK');
        expect(actual).to.deep.equal(DK);
    });
    it('Find by iso alpha 3', function () {
        var actual = country.findByIso3('DNK');
        expect(actual).to.deep.equal(DK);
    });
    it('Find by Name', function () {
        var actual = country.findByName('Denmark');
        expect(actual).to.deep.equal(DK);
    });
    it('Find by capital', function () {
        var actual = country.findByCapital('Copenhagen');
        expect(actual).to.deep.equal(DK);
    });
    it('Find by currency', function () {
        var actual = country.findByCurrency('DKK');
        expect(actual).to.have.lengthOf(3);
    });
    it('find by phone number', function() {
        var actual = country.findByPhoneNbr('+4505551212');
        expect(actual.code.iso2).to.equal('DK');
    });
    it('find by province', function() {
        var actual = country.findByProvince('Nordjylland');
        expect(actual).to.deep.equal(DK);
    });
    it('find by province alias', function() {
        var actual = country.findByProvince('Zealand');
        expect(actual).to.deep.equal(DK);
    });

    it('Cache presence tests', function () {
        ok('DNK' in country.cache.iso3, 'ISO3 cache failed');
        ok('Denmark' in country.cache.name, 'Country name cache failed');
        ok('Copenhagen' in country.cache.capital, 'Capital cache failed');
        ok('DKK' in country.cache.currency, 'Currency cache failed');
        ok('Nordjylland' in country.cache.province, 'Province cache failed');
        ok('Zealand' in country.cache.province, 'Province cache failed');
    });

    it('Null is returned if not found', function () {
        expect(country.findByIso2('XX')).to.be.equal(undefined);
        expect(country.findByIso3('XX')).to.be.equal(undefined);
        expect(country.findByName('XX')).to.be.equal(undefined);
        expect(country.findByCapital('XX')).to.be.equal(undefined);
        expect(country.findByCurrency('XX')).to.be.equal(undefined);
        expect(country.findByPhoneNbr('XX')).to.be.equal(undefined);
        expect(country.findByProvince('XX')).to.be.equal(undefined);
    });
});