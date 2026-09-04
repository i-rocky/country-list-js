'use strict';

// The README has documented things that were not true for years: that searches
// were case-insensitive, that the sample object had `iso_alpha_2` keys, that a
// <script> tag gave you a global. Every claim it makes is asserted here.

const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');
const country = require('../index');

const README = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');

describe('README', () => {
    it('documents lookups that behave as described', () => {
        expect(country.findByIso2('DK').name).to.equal('Denmark');
        expect(country.findByIso3('DNK').name).to.equal('Denmark');
        expect(country.findByName('Denmark').name).to.equal('Denmark');
        expect(country.findByCapital('Copenhagen')[0].name).to.equal('Denmark');
        expect(country.findByProvince('Zealand')[0].name).to.equal('Denmark');
        expect(country.findByPhoneNbr('+4505551212')[0].name).to.equal('Denmark');
        expect(country.findByCurrency('DKK')).to.be.an('array');
        expect(country.findByIso2('ZZ')).to.equal(undefined);
    });

    it('states the right number of euro countries', () => {
        const claimed = README.match(/findByCurrency\('EUR'\)\.length;\s*\/\/ (\d+)/);
        expect(claimed, 'the EUR example went missing').to.not.equal(null);
        expect(country.findByCurrency('EUR').length).to.equal(Number(claimed[1]));
    });

    it('is right that lookups are case-insensitive -- it was not, for years', () => {
        expect(country.findByName('denmark').name).to.equal('Denmark');
        expect(country.findByIso2('dk').name).to.equal('Denmark');
    });

    it('resolves every alias it advertises', () => {
        const aliases = {Danmark: 'Denmark', USA: 'United States',
                         Turkey: 'Türkiye', Swaziland: 'Eswatini',
                         'Czech Republic': 'Czechia'};
        for (const [alias, name] of Object.entries(aliases))
            expect(country.findByName(alias).name, alias).to.equal(name);
    });

    it('shows the phone results it actually returns', () => {
        expect(country.findByPhoneNbr('+12465551212')[0].name).to.equal('Barbados');
        expect(country.findByPhoneNbr('+12125551212').map(c => c.name))
            .to.deep.equal(['Canada', 'United States',
                            'United States Minor Outlying Islands']);
    });

    it('shows a Denmark record that matches the real one', () => {
        // the 3.1.8 README showed `code: { iso_alpha_2, iso_alpha_3 }`, which
        // the code has never returned
        const dk = country.findByIso2('DK');
        expect(dk.code).to.deep.equal({iso2: 'DK', iso3: 'DNK', numeric: '208'});
        expect(dk.currency).to.deep.equal({code: 'DKK', symbol: 'Dkr', decimal: 2});
        expect(dk.native_name).to.equal('Danmark');
        expect(dk.demonym).to.equal('Danish');
        expect(dk.languages).to.deep.equal(['da']);
        expect(dk.tld).to.deep.equal(['.dk']);
        expect(dk.area).to.equal(43094);
        expect(dk.latlng).to.deep.equal([56, 10]);
        expect(dk.timezones).to.deep.equal(['Europe/Copenhagen']);
        expect(dk.borders).to.deep.equal(['DE']);
        expect(dk.dialing_code).to.equal('45');
        expect(dk.provinces.map(p => p.name)).to.deep.equal(
            ['Hovedstaden', 'Midtjylland', 'Nordjylland', 'Sjælland', 'Syddanmark']);
    });

    it('is right that currency.decimal is a number', () => {
        expect(country.findByIso2('DK').currency.decimal).to.be.a('number');
    });

    it('is right about the counts it quotes', () => {
        expect(country.names()).to.have.lengthOf(250);
        expect(country.capitals()).to.have.lengthOf(250);
        expect(country.continents()).to.have.lengthOf(7);
        expect(Object.keys(country.all)).to.have.lengthOf(250);

        const aliases = require('../data/name-aliases.json');
        const claimed = README.match(/(\d+) alternative names/);
        expect(claimed, 'the alias count went missing').to.not.equal(null);
        expect(Object.keys(aliases).length).to.equal(Number(claimed[1]));

        const withProvinces = Object.keys(country.all)
            .filter(k => country.findByIso2(k).provinces);
        const provinceClaim = README.match(/(\d+) of the 250 countries have them/);
        expect(provinceClaim, 'the subdivision count went missing').to.not.equal(null);
        expect(withProvinces.length).to.equal(Number(provinceClaim[1]));
    });

    it('is right that retired currency codes still resolve', () => {
        expect(country.findByCurrency('HRK')[0].name).to.equal('Croatia');
        expect(country.findByIso2('HR').currency.code).to.equal('EUR');
    });

    it('is right that the package has no runtime dependencies', () => {
        const pkg = require('../package.json');
        expect(pkg.dependencies || {}).to.deep.equal({});
    });

    it('points at files that exist', () => {
        for (const f of ['LICENSE', 'CONTRIBUTING.md', 'catalog/country.schema.json',
                         'index.d.ts', 'package.json'])
            expect(fs.existsSync(path.join(__dirname, '..', f)), f).to.equal(true);
    });

    it('no longer advertises the Now service, which has 404ed since 2021', () => {
        expect(README).to.not.match(/now\.sh/);
        expect(README).to.not.match(/rawgit/);
        expect(README).to.not.match(/travis/i);
    });
});
