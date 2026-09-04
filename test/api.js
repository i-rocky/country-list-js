'use strict';

// The module's public surface, and the guarantees that hold for every member
// of it.

const expect = require('chai').expect;

// Installed before the module is required: property loops inside the module
// must not pick up inherited keys.
Object.prototype.__test_inherited__ = () => null;

const country = require('../index');

const MEMBERS = [
    'all', 'findByIso2', 'findByIso3', 'findByName', 'findByCapital',
    'findByCurrency', 'findByProvince', 'findByPhoneNbr', 'ls', 'continents',
    'names', 'capitals',
];

const COUNTRIES = 250;

describe('surface', () => {
    it('exports exactly these members', () => {
        expect(Object.keys(country).sort()).to.deep.equal([...MEMBERS].sort());
    });

    it('exports no cache: lookups are index reads and keep no state', () => {
        expect(country).to.not.have.property('cache');
    });

    it('adds nothing to Array.prototype', () => {
        expect(Array.prototype).to.not.have.property('unpack');
        expect(Array.prototype).to.not.have.property('unique');
    });

    it('keys `all` by ISO-2', () => {
        expect(Object.keys(country.all)).to.have.lengthOf(COUNTRIES);
        expect(country.all.DK.name).to.equal('Denmark');
    });
});

describe('lists', () => {
    it('names() is every country, once', () => {
        const names = country.names();
        expect(names).to.have.lengthOf(COUNTRIES);
        expect(new Set(names).size).to.equal(COUNTRIES);
    });

    it('capitals() is one entry per country', () => {
        expect(country.capitals()).to.have.lengthOf(COUNTRIES);
    });

    it('continents() is the seven continents, deduplicated', () => {
        const c = country.continents();
        expect(c).to.have.lengthOf(7);
        expect(new Set(c).size).to.equal(7);
    });

    it('ls() reads any field across every country', () => {
        expect(country.ls('region')).to.have.lengthOf(COUNTRIES);
        expect(country.ls('iso3')).to.have.lengthOf(COUNTRIES);
    });

    it('ls(), names() and capitals() agree on order', () => {
        expect(country.names()).to.deep.equal(country.ls('name'));
        expect(country.capitals()).to.deep.equal(country.ls('capital'));
    });
});

describe('lookups', () => {
    it('findByIso2 answers the country', () => {
        expect(country.findByIso2('DK').name).to.equal('Denmark');
    });

    it('findByIso3 answers the country', () => {
        expect(country.findByIso3('DNK').name).to.equal('Denmark');
    });

    it('findByName answers the country', () => {
        expect(country.findByName('Denmark').code.iso2).to.equal('DK');
    });

    it('findByCapital answers a list -- capitals are not unique', () => {
        expect(country.findByCapital('Copenhagen').map(c => c.code.iso2))
            .to.deep.equal(['DK']);
        expect(country.findByCapital('Kingston').map(c => c.code.iso2).sort())
            .to.deep.equal(['JM', 'NF']);
    });

    it('findByCurrency answers every country using the code', () => {
        expect(country.findByCurrency('DKK').map(c => c.code.iso2).sort())
            .to.deep.equal(['DK', 'FO', 'GL']);
    });

    it('a finder that can match several always answers a list', () => {
        for (const fn of ['findByCapital', 'findByCurrency', 'findByProvince',
                          'findByPhoneNbr']) {
            expect(country[fn]('no such thing'), fn + ' miss').to.deep.equal([]);
            expect(country[fn](null), fn + '(null)').to.deep.equal([]);
        }
    });

    it('a finder on a unique field always answers a country or undefined', () => {
        for (const fn of ['findByIso2', 'findByIso3', 'findByName']) {
            expect(country[fn]('no such thing'), fn + ' miss').to.equal(undefined);
            expect(country[fn](null), fn + '(null)').to.equal(undefined);
        }
    });

    it('findByProvince answers by name and by alias', () => {
        expect(country.findByProvince('Nordjylland')[0].code.iso2).to.equal('DK');
        expect(country.findByProvince('Zealand')[0].code.iso2).to.equal('DK');
    });

    it('findByPhoneNbr answers on the most specific prefix', () => {
        expect(country.findByPhoneNbr('+4505551212').map(c => c.code.iso2))
            .to.deep.equal(['DK']);
        expect(country.findByPhoneNbr('+12465551212').map(c => c.name))
            .to.deep.equal(['Barbados']);
    });

    it('returns a fresh object every time, so a caller cannot poison a later one', () => {
        const first = country.findByIso2('DK');
        first.name = 'mutated';
        expect(country.findByIso2('DK').name).to.equal('Denmark');
    });
});

describe('inherited properties', () => {
    it('does not leak Object.prototype keys into any result', () => {
        expect(country.findByIso2('DK')).to.not.have.own.property('__test_inherited__');
        expect(country.names()).to.have.lengthOf(COUNTRIES);
    });

    after(() => { delete Object.prototype.__test_inherited__; });
});
