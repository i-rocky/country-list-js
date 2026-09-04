'use strict';

// Happy, error and edge cases.  Every edge case here is pinned to a specific
// defect -- the comment says which one -- so that a future refactor that
// reintroduces it fails loudly rather than quietly shipping.

const expect = require('chai').expect;
const country = require('../index');

// Finders on a field the data guarantees unique answer a country or undefined;
// the rest always answer a list.
const UNIQUE = ['findByIso2', 'findByIso3', 'findByName'];
const LIST = ['findByCapital', 'findByCurrency', 'findByProvince', 'findByPhoneNbr'];
const FINDERS = [...UNIQUE, ...LIST];

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

    it('findByCapital returns a list, because capitals are not unique', () => {
        expect(country.findByCapital('Copenhagen').map(c => c.name))
            .to.deep.equal(['Denmark']);
        expect(country.findByCapital('Kingston').map(c => c.name).sort())
            .to.deep.equal(['Jamaica', 'Norfolk Island']);
    });

    it('findByCurrency returns an array when several countries share one', () => {
        const dkk = country.findByCurrency('DKK');
        expect(dkk).to.be.an('array').with.lengthOf(3);
        expect(dkk.map(c => c.name)).to.include('Denmark');
    });

    it('findByProvince matches on name and on alias', () => {
        expect(country.findByProvince('Nordjylland')[0].name).to.equal('Denmark');
        expect(country.findByProvince('Zealand')[0].name).to.equal('Denmark');
        expect(country.findByProvince('Texas')[0].name).to.equal('United States');
    });

    it('findByPhoneNbr matches a unique dialing code', () => {
        expect(country.findByPhoneNbr('+4505551212')[0].name).to.equal('Denmark');
        expect(country.findByPhoneNbr('+8804005050')[0].name).to.equal('Bangladesh');
    });

    it('findByPhoneNbr answers on the most specific prefix', () => {
        // +1-246 is Barbados and +1 is US/Canada/UM.  Barbados is the answer;
        // the wider block is not.
        expect(country.findByPhoneNbr('+12465551212').map(c => c.name))
            .to.deep.equal(['Barbados']);
    });

    it('findByPhoneNbr distinguishes +44 from +44-1534', () => {
        expect(country.findByPhoneNbr('+442071234567')[0].name).to.equal('United Kingdom');
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

    it('a miss is undefined on a unique finder and empty on a list one', () => {
        for (const fn of UNIQUE)
            expect(country[fn]('ZZZ_NO_SUCH_THING'), fn).to.equal(undefined);
        for (const fn of LIST)
            expect(country[fn]('ZZZ_NO_SUCH_THING'), fn).to.deep.equal([]);
    });

    it('findByPhoneNbr answers empty for non-strings rather than throwing', () => {
        for (const v of [undefined, null, 42, {}, [], true, NaN])
            expect(country.findByPhoneNbr(v)).to.deep.equal([]);
    });

    it('findByPhoneNbr tolerates junk strings', () => {
        for (const v of ['XX', '+', '', '()- ', '+999999999999999', 'x'.repeat(5000)])
            expect(country.findByPhoneNbr(v), JSON.stringify(v.slice(0, 20)))
                .to.deep.equal([]);
    });

    it('ls() on an unknown field yields undefineds rather than throwing', () => {
        expect(() => country.ls('nope')).to.not.throw();
        expect(country.ls('nope').every(v => v === undefined)).to.equal(true);
    });

    it('a very long lookup value does not blow up', () => {
        const long = 'A'.repeat(100000);
        for (const fn of UNIQUE) expect(country[fn](long), fn).to.equal(undefined);
        for (const fn of LIST) expect(country[fn](long), fn).to.deep.equal([]);
    });
});

describe('Edge cases', () => {
    it('findByProvince is stable across repeated calls', () => {
        // a memoised lookup that stores its result unpacked and unpacks it
        // again on the way out throws on the second call. 3.1.8 did exactly
        // that; there is no cache here, and this holds it to that.
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
            expect(r.every(o => o && o.name), nbr + ' -> ' + JSON.stringify(r))
                .to.equal(true);
        }
    });

    it('sweeps every dialing code without producing a hole', () => {
        for (const iso2 of Object.keys(country.all)) {
            const c = country.findByIso2(iso2);
            if (!c.dialing_code) continue;
            for (const area of c.area_codes || ['']) {
                const r = country.findByPhoneNbr('+' + c.dialing_code + area + '5551212');
                expect(r.length && r.every(o => o && o.name), iso2 + ' (+' + c.dialing_code + area + ')')
                    .to.be.ok;
                expect(r.map(o => o.code.iso2), iso2 + ' (+' + c.dialing_code + area + ')')
                    .to.include(iso2);
            }
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

    it('every data value the code indexes or concatenates is a string', () => {
        // A dialing code merged as a number once made require() itself throw,
        // with "phone[k].replace is not a function".  The optional fields are
        // a string or absent, never anything else.
        for (const r of require('../data/countries.json')) {
            for (const f of ['iso2', 'iso3', 'name', 'region'])
                expect(r[f], r.iso2 + '.' + f + ' = ' + JSON.stringify(r[f]))
                    .to.be.a('string');
            for (const f of ['capital', 'currency', 'currency_symbol', 'dialing_code'])
                expect(r[f], r.iso2 + '.' + f + ' = ' + JSON.stringify(r[f]))
                    .to.satisfy(v => v === undefined || typeof v === 'string');
            for (const a of r.area_codes || [])
                expect(a, r.iso2 + ' area code').to.match(/^[0-9]+$/);
        }
    });

    it('handles the territories with no capital, no dialing code or no currency', () => {
        // uninhabited or disputed territories: they are real records with real
        // ISO codes and must round-trip.  A value that does not exist is
        // undefined, never an empty string -- 3.1.8 carried '' for the capital
        // of Antarctica and ' ' for the dialing code of Heard Island
        const without = f => Object.keys(country.all)
            .filter(k => country.findByIso2(k)[f] === undefined);

        expect(without('capital')).to.have.members(['AQ', 'BQ', 'BV', 'HM', 'TK', 'UM']);
        expect(without('dialing_code')).to.have.members(['BV', 'HM', 'TF']);
        expect(without('currency')).to.deep.equal(['AQ']);

        for (const iso2 of Object.keys(country.all)) {
            const c = country.findByIso2(iso2);
            expect(c.name, iso2).to.be.a('string').and.not.equal('');
            expect(c.code.iso2, iso2).to.equal(iso2);
            expect(c.code.iso3, iso2).to.match(/^[A-Z]{3}$/);
            for (const f of ['capital', 'dialing_code'])
                expect(c[f], iso2 + '.' + f).to.satisfy(v => v === undefined || (typeof v === 'string' && v.trim() === v && v !== ''));
        }
    });

    it('does not read Object.prototype as data', () => {
        // the indexes are keyed by value; a plain object would answer
        // findByIso2('constructor') with Object itself
        for (const q of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'])
            for (const fn of UNIQUE)
                expect(country[fn](q), fn + '(' + q + ')').to.equal(undefined);
        for (const q of ['constructor', '__proto__', 'toString', 'hasOwnProperty'])
            for (const fn of LIST)
                expect(country[fn](q), fn + '(' + q + ')').to.deep.equal([]);
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
                expect(Object.keys(p).sort(), iso2 + '/' + p.name)
                    .to.deep.equal(['alias', 'code', 'name', 'region']);
                expect(p.name, iso2).to.be.a('string').and.not.equal('');
                expect(p.code, iso2 + '/' + p.name)
                    .to.satisfy(v => v === null || typeof v === 'string');
                expect(p.region, iso2 + '/' + p.name)
                    .to.satisfy(v => v === null || typeof v === 'string');
                // never a bare string: String.indexOf makes a lookup a
                // substring search
                expect(p.alias, iso2 + '/' + p.name)
                    .to.satisfy(a => a === null || Array.isArray(a));
            }
        }
    });

    it('round-trips non-ASCII values', () => {
        expect(country.findByProvince('Sjælland')[0].name).to.equal('Denmark');
        expect(country.findByProvince('Zealand')[0].name).to.equal('Denmark');
        expect(country.findByProvince('Muğla')[0].name).to.equal('Türkiye');
        expect(country.findByProvince('Bắc Ninh')[0].name).to.equal('Vietnam');
        expect(country.findByProvince('বরিশাল')[0].name).to.equal('Bangladesh');
        expect(country.findByName('Ivory Coast').code.iso2).to.equal('CI');
        expect(country.findByName("Côte d'Ivoire").code.iso2).to.equal('CI');
    });

    it('spells names and capitals as they are spelled, and finds them without the marks', () => {
        // Bogotá is Bogotá.  The ASCII form a caller types still finds it,
        // because a lookup that misses exactly is retried with case and Latin
        // diacritics folded away.
        const nonAscii = s => [...s].some(ch => ch.codePointAt(0) > 127);
        expect(country.names().filter(nonAscii).sort()).to.deep.equal([
            "Côte d'Ivoire", 'Curaçao', 'Réunion', 'Saint Barthélemy',
            'São Tomé and Príncipe', 'Türkiye', 'Åland Islands',
        ].sort());
        expect(country.capitals().filter(c => c && nonAscii(c)).length).to.be.at.least(15);
        expect(country.findByIso2('CO').capital).to.equal('Bogotá');
        expect(country.findByIso2('IS').capital).to.equal('Reykjavík');

        for (const [q, name] of [['Bogota', 'Colombia'], ['REYKJAVIK', 'Iceland'],
                                 ['Sao Tome', 'São Tomé and Príncipe'], ['Nuku\'alofa', 'Tonga'],
                                 ['Chisinau', 'Moldova'], ['hagatna', 'Guam']])
            expect(country.findByCapital(q).map(c => c.name), q).to.deep.equal([name]);
        for (const [q, name] of [['Aland Islands', 'Åland Islands'], ['curacao', 'Curaçao'],
                                 ['Reunion', 'Réunion'], ['Sao Tome and Principe', 'São Tomé and Príncipe']])
            expect(country.findByName(q).name, q).to.equal(name);

        const provinces = [].concat(...Object.keys(country.all)
            .map(k => country.findByIso2(k).provinces || []).map(ps => ps.map(p => p.name)));
        expect(provinces.filter(nonAscii).length, 'provinces with non-ASCII names')
            .to.be.greaterThan(100);
        for (const [q, name] of [['Cordoba', 'Argentina'], ['camaguey', 'Cuba'], ['Mugla', 'Türkiye'],
                                 ['Bac Ninh', 'Vietnam'], ['Michoacan', 'Mexico']])
            expect(country.findByProvince(q).map(c => c.name), q).to.include(name);
    });

    it('folds only Latin diacritics, never the letters of another script', () => {
        // stripping every combining mark would turn Bengali vowel signs into
        // nothing and merge words that differ
        expect(country.findByProvince('বরিশাল').map(c => c.name)).to.deep.equal(['Bangladesh']);
        expect(country.findByName('日本').name).to.equal('Japan');
        expect(country.findByName('मारत')).to.equal(undefined);
    });

    it('an exact match still wins over a folded one', () => {
        // Kingston (exact) answers both holders; folding cannot add a third
        expect(country.findByCapital('Kingston').map(c => c.code.iso2).sort()).to.deep.equal(['JM', 'NF']);
        expect(country.findByCapital('kingston').map(c => c.code.iso2).sort()).to.deep.equal(['JM', 'NF']);
    });

    it('matches a province alias whole, never as a substring', () => {
        // aliases are compared as list members. Held as bare strings, as three
        // once were, String.indexOf makes every query a substring search and
        // findByProvince('B') answers whichever country sorts first.
        expect(country.findByProvince('Bac Ninh')[0].name).to.equal('Vietnam');
        for (const q of ['B', 'Bac', 'inh', 'Zeal', 'and', 'a'])
            expect(country.findByProvince(q), q).to.deep.equal([]);
    });

    it('keeps ISO codes unique across the whole list', () => {
        const iso3 = country.ls('iso3');
        expect(new Set(iso3).size, 'duplicate ISO-3 codes').to.equal(iso3.length);
        const names = country.names();
        expect(new Set(names).size, 'duplicate country names').to.equal(names.length);
    });

    it('a mutated result does not corrupt the next lookup', () => {
        // every result is built fresh, so writing to one cannot reach
        // another. Handing back a shared object made
        // `findByName('Denmark').name = 'x'` answer 'x' from then on.
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
        const first = r => Array.isArray(r) ? r[0] : r;
        for (const [fn, arg] of calls) {
            const a = first(country[fn](arg)), b = first(country[fn](arg));
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
