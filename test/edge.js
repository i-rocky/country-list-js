'use strict';

// Happy, error and edge cases.  Every edge case here is pinned to a specific
// defect -- the comment says which one -- so that a future refactor that
// reintroduces it fails loudly rather than quietly shipping.

const expect = require('chai').expect;
const country = require('../index');

const FINDERS = ['findByIso2', 'findByIso3', 'findByName', 'findByCapital',
                 'findByCurrency', 'findByProvince', 'findByPhoneNbr'];

describe('Happy path', () => {
    it('findByIso2 returns a single country', () => {
        expect(country.findByIso2('DK').name).to.equal('Denmark');
        expect(country.findByIso2('BD').name).to.equal('Bangladesh');
    });

    it('findByIso3 returns a single country', () => {
        expect(country.findByIso3('DNK').name).to.equal('Denmark');
    });

    it('findByName round-trips every country in the list', () => {
        for (const iso2 of Object.keys(country.all)) {
            const name = country.findByIso2(iso2).name;
            const found = country.findByName(name);
            const names = (Array.isArray(found) ? found : [found]).map(c => c.name);
            expect(names, iso2 + ' / ' + name).to.include(name);
        }
    });

    it('findByIso3 round-trips every country in the list', () => {
        for (const iso2 of Object.keys(country.all)) {
            const iso3 = country.findByIso2(iso2).code.iso3;
            expect(country.findByIso3(iso3).code.iso2, iso3).to.equal(iso2);
        }
    });

    it('findByCapital returns a single country', () => {
        expect(country.findByCapital('Copenhagen').name).to.equal('Denmark');
    });

    it('findByCurrency returns an array when several countries share one', () => {
        const dkk = country.findByCurrency('DKK');
        expect(dkk).to.be.an('array').with.lengthOf(3);
        expect(dkk.map(c => c.name)).to.include('Denmark');
    });

    it('findByProvince matches on name and on alias', () => {
        expect(country.findByProvince('Nordjylland').name).to.equal('Denmark');
        expect(country.findByProvince('Zealand').name).to.equal('Denmark');
        expect(country.findByProvince('Texas').name).to.equal('United States');
    });

    it('findByPhoneNbr matches a unique dialing code', () => {
        expect(country.findByPhoneNbr('+4505551212').name).to.equal('Denmark');
        expect(country.findByPhoneNbr('+8804005050').name).to.equal('Bangladesh');
    });

    it('findByPhoneNbr answers on the most specific prefix', () => {
        // +1-246 is Barbados and +1 is US/Canada/UM.  Barbados is the answer;
        // the wider block is not.
        expect(country.findByPhoneNbr('+12465551212').name).to.equal('Barbados');
    });

    it('findByPhoneNbr distinguishes +44 from +44-1534', () => {
        expect(country.findByPhoneNbr('+442071234567').name).to.equal('United Kingdom');
        const jersey = country.findByPhoneNbr('+441534123456');
        expect((Array.isArray(jersey) ? jersey[0] : jersey).name).to.equal('Jersey');
    });

    it('the list functions agree with all', () => {
        const n = Object.keys(country.all).length;
        expect(country.names()).to.have.lengthOf(n);
        expect(country.capitals()).to.have.lengthOf(n);
        expect(country.ls('region')).to.have.lengthOf(n);
        expect(country.continents()).to.have.lengthOf(7);
    });

    it('survives being destructured off the module', () => {
        // the list functions used to read `this`, so pulling them off the
        // module threw "Cannot read properties of undefined"
        const {names, capitals, continents, ls} = country;
        expect(names()).to.have.lengthOf(250);
        expect(capitals()).to.have.lengthOf(250);
        expect(continents()).to.have.lengthOf(7);
        expect(ls('name')).to.have.lengthOf(250);
    });
});

describe('Error path', () => {
    const HOSTILE = [['undefined', undefined], ['null', null], ['a number', 42],
                     ['an object', {}], ['an array', []], ['a boolean', true],
                     ['NaN', NaN], ['a symbol-ish string', '\\u0000']];

    for (const [label, value] of HOSTILE)
        it('no finder throws on ' + label, () => {
            for (const fn of FINDERS)
                expect(() => country[fn](value), fn + '(' + label + ')').to.not.throw();
        });

    it('unknown values return undefined, never null and never a throw', () => {
        for (const fn of FINDERS)
            expect(country[fn]('ZZZ_NO_SUCH_THING'), fn).to.equal(undefined);
    });

    it('findByPhoneNbr returns undefined for non-strings', () => {
        // 3.1.8 raised a TypeError here while every other finder returned
        // undefined; a lookup has no business throwing on bad input
        for (const v of [undefined, null, 42, {}, [], true, NaN])
            expect(country.findByPhoneNbr(v)).to.equal(undefined);
    });

    it('findByPhoneNbr tolerates junk strings', () => {
        for (const v of ['XX', '+', '', '()- ', '+999999999999999', 'x'.repeat(5000)])
            expect(country.findByPhoneNbr(v), JSON.stringify(v.slice(0, 20)))
                .to.equal(undefined);
    });

    it('ls() on an unknown field yields undefineds rather than throwing', () => {
        expect(() => country.ls('nope')).to.not.throw();
        expect(country.ls('nope').every(v => v === undefined)).to.equal(true);
    });

    it('a very long lookup value does not blow up', () => {
        const long = 'A'.repeat(100000);
        for (const fn of FINDERS) expect(country[fn](long), fn).to.equal(undefined);
    });
});

describe('Edge cases', () => {
    it('findByProvince is stable across repeated calls', () => {
        // the shipped 3.1.8 caches the unpacked result and then calls .map on
        // it, so the second lookup of any single-country province throws
        // "self.cache.province[name].map is not a function"
        for (const name of ['Nordjylland', 'Zealand', 'Texas', 'XX']) {
            const first = country.findByProvince(name);
            for (let i = 0; i < 3; i++)
                expect(country.findByProvince(name), name + ' call ' + (i + 2))
                    .to.deep.equal(first);
        }
    });

    it('the other finders are stable across repeated calls', () => {
        const calls = [['findByIso2', 'DK'], ['findByIso3', 'DNK'],
                       ['findByName', 'Denmark'], ['findByCapital', 'Copenhagen'],
                       ['findByCurrency', 'DKK'], ['findByPhoneNbr', '+4505551212']];
        for (const [fn, arg] of calls) {
            const first = country[fn](arg);
            expect(country[fn](arg), fn).to.deep.equal(first);
            expect(country[fn](arg), fn).to.deep.equal(first);
        }
    });

    it('never returns a null or undefined inside a result array', () => {
        // AC (+247) and TA (+290) carry dialing codes but no country record,
        // so they used to surface as holes: +290 returned [null, Saint Helena]
        const probes = ['+2901234', '+2471234', '+12465551212', '+12125551212',
                        '+15551212', '+3312345678'];
        for (const nbr of probes) {
            const r = country.findByPhoneNbr(nbr);
            if (Array.isArray(r))
                expect(r.every(o => o && o.name), nbr + ' -> ' + JSON.stringify(r))
                    .to.equal(true);
        }
    });

    it('sweeps every dialing code without producing a hole', () => {
        for (const iso2 of Object.keys(country.all)) {
            const code = country.findByIso2(iso2).dialing_code.replace(/\D/g, '');
            if (!code) continue;
            const r = country.findByPhoneNbr('+' + code + '5551212');
            const list = r === undefined ? [] : Array.isArray(r) ? r : [r];
            expect(list.every(o => o && o.name), iso2 + ' (+' + code + ')')
                .to.equal(true);
        }
    });

    it('adds nothing enumerable to Array.prototype', () => {
        // an enumerable prototype property shows up in every for..in loop over
        // an array anywhere in the host application.  test/api.js deliberately
        // pollutes Object.prototype, so assert about our own two properties
        // rather than demanding a pristine environment
        const seen = [];
        for (const k in [10, 20]) seen.push(k);
        expect(seen).to.include.members(['0', '1']);
        expect(seen).to.not.include('unpack');
        expect(seen).to.not.include('unique');

        for (const p of ['unpack', 'unique'])
            expect(Object.getOwnPropertyDescriptor(Array.prototype, p),
                'Array.prototype.' + p).to.equal(undefined);
        expect(Object.keys(Array.prototype)).to.deep.equal([]);
    });

    it('every data value the code calls string methods on is a string', () => {
        // A dialing code merged as a number once made require() itself throw,
        // with "phone[k].replace is not a function".
        for (const r of require('../data/countries.json'))
            for (const f of ['iso2', 'iso3', 'name', 'capital', 'currency',
                             'currency_symbol', 'dialing_code', 'region'])
                expect(r[f], r.iso2 + '.' + f + ' = ' + JSON.stringify(r[f]))
                    .to.be.a('string');
    });

    it('handles the countries with a blank capital or a blank dialing code', () => {
        // uninhabited or disputed territories: they are real records with real
        // ISO codes and must round-trip, blank fields and all
        const blankCapital = Object.keys(country.all)
            .filter(k => !country.findByIso2(k).capital.trim());
        const blankDialing = Object.keys(country.all)
            .filter(k => !country.findByIso2(k).dialing_code.trim());

        expect(blankCapital).to.have.members(['AQ', 'BQ', 'BV', 'HM', 'TK', 'UM']);
        expect(blankDialing).to.have.members(['AQ', 'BV', 'GS', 'HM', 'TF', 'XK']);

        for (const iso2 of new Set([...blankCapital, ...blankDialing])) {
            const c = country.findByIso2(iso2);
            expect(c.name, iso2).to.be.a('string').and.not.equal('');
            expect(c.capital, iso2).to.be.a('string');
            expect(c.dialing_code, iso2).to.be.a('string');
            expect(c.code.iso2, iso2).to.equal(iso2);
            expect(c.code.iso3, iso2).to.match(/^[A-Z]{3}$/);
        }
    });

    it('handles the 219 countries that have no provinces', () => {
        const without = Object.keys(country.all)
            .filter(k => country.findByIso2(k).provinces === undefined);
        expect(without).to.have.lengthOf(219);
        for (const iso2 of without)
            expect('provinces' in country.findByIso2(iso2), iso2).to.equal(true);
    });

    it('every province entry that does exist is well formed', () => {
        for (const iso2 of Object.keys(country.all)) {
            const provinces = country.findByIso2(iso2).provinces;
            if (!provinces) continue;
            expect(provinces, iso2).to.be.an('array').that.is.not.empty;
            for (const p of provinces) {
                expect(p.name, iso2).to.be.a('string').and.not.equal('');
                if (p.alias !== null && p.alias !== undefined)
                    // three entries carry a bare string rather than an array;
                    // Phase 2 normalises the data, and findByProvince already
                    // copes either way
                    expect(p.alias, iso2 + '/' + p.name)
                        .to.satisfy(a => Array.isArray(a) || typeof a === 'string');
            }
        }
    });

    it('round-trips non-ASCII values', () => {
        expect(country.findByProvince('Sjælland').name).to.equal('Denmark');
        expect(country.findByProvince('Zealand').name).to.equal('Denmark');
        expect(country.findByProvince('Muğla').name).to.equal('Turkey');
        expect(country.findByProvince('Bình Phước').name).to.equal('Vietnam');
        expect(country.findByProvince('বরিশাল').name).to.equal('Bangladesh');
        expect(country.findByName('Ivory Coast').code.iso2).to.equal('CI');
    });

    it('carries transliterated country names and capitals, not native forms', () => {
        // worth pinning: not one of the 250 names or capitals contains a
        // non-ASCII character -- they are all transliterated (Bogota,
        // Reykjavik, Asuncion) -- while province names are not
        const nonAscii = s => [...s].some(ch => ch.codePointAt(0) > 127);
        expect(country.names().filter(nonAscii)).to.deep.equal([]);
        expect(country.capitals().filter(nonAscii)).to.deep.equal([]);
        expect(country.findByIso2('CO').capital).to.equal('Bogota');
        expect(country.findByIso2('IS').capital).to.equal('Reykjavik');

        const provinces = [].concat(...Object.keys(country.all)
            .map(k => country.findByIso2(k).provinces || []).map(ps => ps.map(p => p.name)));
        expect(provinces.filter(nonAscii).length, 'provinces with non-ASCII names')
            .to.be.greaterThan(100);
    });

    it('does not turn a province alias into a substring search', () => {
        // three province aliases are bare strings rather than arrays, and
        // 'Binh Phuoc'.indexOf('B') > -1, so findByProvince('B') used to
        // answer Vietnam
        expect(country.findByProvince('Binh Phuoc').name).to.equal('Vietnam');
        for (const q of ['B', 'Binh', 'oc', 'Zeal', 'and', 'a'])
            expect(country.findByProvince(q), q).to.equal(undefined);
    });

    it('keeps ISO codes unique across the whole list', () => {
        const iso3 = country.ls('iso3');
        expect(new Set(iso3).size, 'duplicate ISO-3 codes').to.equal(iso3.length);
        const names = country.names();
        expect(new Set(names).size, 'duplicate country names').to.equal(names.length);
    });

    it('a mutated result does not corrupt the next lookup', () => {
        // 3.1.8 cached the transformed object and handed back that very
        // object every time, so `findByName('Denmark').name = 'x'` poisoned
        // the cache for the life of the process -- every later lookup of
        // Denmark answered 'x'.  findByIso2 was fine; the other five were not.
        const calls = [['findByIso2', 'FR'], ['findByIso3', 'FRA'],
                       ['findByName', 'France'], ['findByCapital', 'Paris'],
                       ['findByProvince', 'Texas'], ['findByPhoneNbr', '+33123456789']];

        for (const [fn, arg] of calls) {
            const before = JSON.parse(JSON.stringify(country[fn](arg)));
            const victim = country[fn](arg);
            const one = Array.isArray(victim) ? victim[0] : victim;

            one.name = 'MUTATED';
            one.capital = 'MUTATED';
            one.currency.code = 'MUT';
            one.code.iso2 = 'MU';

            expect(JSON.parse(JSON.stringify(country[fn](arg))), fn + '(' + arg + ')')
                .to.deep.equal(before);
        }
    });

    it('hands back a distinct object on every call', () => {
        const calls = [['findByIso2', 'DK'], ['findByIso3', 'DNK'],
                       ['findByName', 'Denmark'], ['findByCapital', 'Copenhagen'],
                       ['findByProvince', 'Zealand'], ['findByPhoneNbr', '+4505551212']];
        for (const [fn, arg] of calls) {
            const a = country[fn](arg), b = country[fn](arg);
            expect(a, fn).to.not.equal(b);
            expect(a.currency, fn + ' currency').to.not.equal(b.currency);
            expect(a.code, fn + ' code').to.not.equal(b.code);
            expect(a, fn).to.deep.equal(b);
        }
    });

    it('does not let a mutation through the all map either', () => {
        const before = country.all.DE.name;
        country.findByIso2('DE').name = 'MUTATED';
        expect(country.all.DE.name).to.equal(before);
    });
});
