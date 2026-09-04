'use strict';

// Lookup behaviour added in 4.0.  Everything here turns a query that answered
// undefined into a hit; none of it can change a query that already worked.

const expect = require('chai').expect;
const country = require('../index');
const retired = require('../data/retired-currencies.json');
const aliases = require('../data/name-aliases.json');

const one = r => Array.isArray(r) ? r[0] : r;
const names = r => (r === undefined ? [] : Array.isArray(r) ? r : [r]).map(c => c.name);

describe('Retired currency codes', () => {
    it('resolves every retired code to the country that used it', () => {
        for (const [code, r] of Object.entries(retired)) {
            const found = country.findByCurrency(code);
            expect(found, code).to.not.equal(undefined);
            expect(names(found).sort(), code)
                .to.deep.equal(r.countries.map(c => country.findByIso2(c).name).sort());
        }
    });

    it('resolves the specific pre-euro codes rather than every euro country', () => {
        // HRK must answer Croatia alone, not the 37 countries now on the euro
        expect(names(country.findByCurrency('HRK'))).to.deep.equal(['Croatia']);
        expect(names(country.findByCurrency('LTL'))).to.deep.equal(['Lithuania']);
        expect(names(country.findByCurrency('BGN'))).to.deep.equal(['Bulgaria']);
    });

    it('carries the corrected code on the country itself', () => {
        const now = {HR: 'EUR', LT: 'EUR', BG: 'EUR', VE: 'VES', MR: 'MRU',
                     ST: 'STN', SL: 'SLE', ZW: 'ZWG', ZM: 'ZMW', BY: 'BYN'};
        for (const [iso2, code] of Object.entries(now))
            expect(country.findByIso2(iso2).currency.code, iso2).to.equal(code);
    });

    it('never lets a retired code shadow an active one', () => {
        for (const code of Object.keys(retired))
            expect(country.ls('currency'), code + ' is retired but still in use')
                .to.not.include(code);
    });

    it('gives every active currency a symbol and a decimal', () => {
        for (const iso2 of Object.keys(country.all)) {
            const c = country.findByIso2(iso2).currency;
            expect(c.symbol, iso2).to.be.a('string').and.not.equal('');
            expect(c.decimal, iso2).to.match(/^[0-9]$/);
        }
    });
});

describe('Name aliases', () => {
    it('resolves every alias in the table', () => {
        for (const [alias, iso2] of Object.entries(aliases))
            expect(one(country.findByName(alias)), alias).to.include({
                name: country.findByIso2(iso2).name,
            });
    });

    it('resolves the modern ISO names for countries listed under an older one', () => {
        const modern = {
            'Türkiye': 'Turkey', 'Turkiye': 'Turkey',
            'Eswatini': 'Swaziland', 'North Macedonia': 'Macedonia',
            'Czechia': 'Czech Republic', 'Cabo Verde': 'Cape Verde',
            'Timor-Leste': 'East Timor', "Côte d'Ivoire": 'Ivory Coast',
            'Holy See': 'Vatican', 'Myanmar': 'Myanmar',
        };
        for (const [alias, name] of Object.entries(modern))
            expect(one(country.findByName(alias)), alias).to.have.property('name', name);
    });

    it('resolves the forms people actually type', () => {
        const typed = {USA: 'United States', 'U.S.A.': 'United States',
                       UK: 'United Kingdom', UAE: 'United Arab Emirates',
                       Holland: 'Netherlands', Burma: 'Myanmar',
                       'DR Congo': 'Democratic Republic of the Congo',
                       Danmark: 'Denmark', Deutschland: 'Germany'};
        for (const [alias, name] of Object.entries(typed))
            expect(one(country.findByName(alias)), alias).to.have.property('name', name);
    });

    it('never lets an alias shadow a real country name', () => {
        const real = new Map(Object.keys(country.all)
            .map(k => [country.findByIso2(k).name.toLowerCase(), k]));
        for (const [alias, iso2] of Object.entries(aliases)) {
            const owner = real.get(alias.toLowerCase());
            expect(!owner || owner === iso2,
                JSON.stringify(alias) + ' is the real name of ' + owner +
                ' but aliases to ' + iso2).to.equal(true);
        }
    });

    it('keeps every real country name resolving to itself', () => {
        for (const iso2 of Object.keys(country.all)) {
            const name = country.findByIso2(iso2).name;
            expect(names(country.findByName(name)), name).to.include(name);
        }
    });

    it('does not put bare ISO codes into the name index', () => {
        for (const code of ['DK', 'FR', 'DNK', 'FRA'])
            expect(country.findByName(code), code).to.equal(undefined);
    });
});

describe('Case-insensitive fallback', () => {
    it('finds by any casing once the exact match misses', () => {
        for (const v of ['dk', 'Dk', 'dK'])
            expect(country.findByIso2(v), v).to.have.property('name', 'Denmark');
        for (const v of ['dnk', 'Dnk'])
            expect(country.findByIso3(v), v).to.have.property('name', 'Denmark');
        for (const v of ['denmark', 'DENMARK', 'DeNmArK'])
            expect(country.findByName(v), v).to.have.property('name', 'Denmark');
        expect(country.findByCapital('copenhagen')).to.have.property('name', 'Denmark');
        expect(names(country.findByCurrency('dkk'))).to.include('Denmark');
    });

    it('applies to aliases too', () => {
        expect(one(country.findByName('türkiye'))).to.have.property('name', 'Turkey');
        expect(one(country.findByName('CZECHIA'))).to.have.property('name', 'Czech Republic');
    });

    it('exact match always wins', () => {
        // every exact lookup must answer exactly what it answered before the
        // fallback existed -- the fallback runs only after an exact miss
        for (const iso2 of Object.keys(country.all)) {
            const c = country.findByIso2(iso2);
            expect(country.findByIso2(iso2).code.iso2, iso2).to.equal(iso2);
            expect(country.findByIso3(c.code.iso3).code.iso2, iso2).to.equal(iso2);
            expect(names(country.findByName(c.name)), c.name).to.include(c.name);
        }
    });

    it('still answers undefined for values that match nothing', () => {
        for (const v of ['zz', 'zzz', 'no such country', 'no such capital'])
            for (const fn of ['findByIso2', 'findByIso3', 'findByName', 'findByCapital'])
                expect(country[fn](v), fn + '(' + v + ')').to.equal(undefined);
    });
});

describe('findByPhoneNbr', () => {
    const names = r => (r === undefined ? [] : Array.isArray(r) ? r : [r]).map(c => c.name);

    it('answers on the most specific prefix, not the block above it', () => {
        expect(country.findByPhoneNbr('+12465551212'))
            .to.have.property('name', 'Barbados');
        expect(country.findByPhoneNbr('+441534123456'))
            .to.have.property('name', 'Jersey');
    });

    it('still returns every country sharing one prefix', () => {
        // +1 really is held by three territories at the same length
        expect(names(country.findByPhoneNbr('+12125551212')).sort())
            .to.deep.equal(['Canada', 'United States',
                            'United States Minor Outlying Islands']);
    });

    it('answers every country from its own dialing code', () => {
        for (const iso2 of Object.keys(country.all)) {
            const code = country.findByIso2(iso2).dialing_code.replace(/\D/g, '');
            if (!code) continue;
            expect(names(country.findByPhoneNbr('+' + code + '5551212')), iso2)
                .to.not.be.empty;
        }
    });

    it('answers undefined for input that matches nothing', () => {
        for (const v of ['XX', '', '+', null, 42])
            expect(country.findByPhoneNbr(v), String(v)).to.equal(undefined);
    });
});
