'use strict';

// The fields added in 4.0.  Coverage numbers are asserted as well as shape, so
// that a bad import which silently drops half the data fails here rather than
// shipping.

const expect = require('chai').expect;
const country = require('../index');

const all = Object.keys(country.all);
const each = fn => all.forEach(iso2 => fn(country.findByIso2(iso2), iso2));
const withField = f => all.filter(iso2 => country.findByIso2(iso2)[f] !== undefined);

describe('borders', () => {
    it('are ISO-2 codes of countries that exist', () => {
        each((c, iso2) => (c.borders || []).forEach(b => {
            expect(b, iso2).to.match(/^[A-Z]{2}$/);
            expect(country.all, iso2 + ' borders unknown ' + b).to.have.property(b);
        }));
    });

    it('are symmetric: if A borders B then B borders A', () => {
        const broken = [];
        each((c, iso2) => (c.borders || []).forEach(b => {
            if (!(country.findByIso2(b).borders || []).includes(iso2))
                broken.push(iso2 + ' -> ' + b);
        }));
        expect(broken, 'one-way borders').to.deep.equal([]);
    });

    it('never list a country as its own neighbour, and never repeat', () => {
        each((c, iso2) => {
            const b = c.borders || [];
            expect(b, iso2).to.not.include(iso2);
            expect(b.length, iso2 + ' has duplicates').to.equal(new Set(b).size);
        });
    });

    it('are absent for islands and present for the obvious cases', () => {
        for (const iso2 of ['JP', 'IS', 'NZ', 'MG', 'CU'])
            expect(country.findByIso2(iso2).borders, iso2).to.equal(undefined);
        expect(country.findByIso2('PT').borders).to.deep.equal(['ES']);
        expect(country.findByIso2('US').borders).to.have.members(['CA', 'MX']);
        expect(country.findByIso2('XK').borders).to.have.members(['AL', 'ME', 'MK', 'RS']);
    });

    it('cover the countries that have land neighbours', () => {
        expect(withField('borders').length).to.be.at.least(160);
    });
});

describe('timezones', () => {
    it('are identifiers the platform accepts', () => {
        each((c, iso2) => (c.timezones || []).forEach(z => {
            expect(() => new Intl.DateTimeFormat('en', {timeZone: z}),
                iso2 + ' has invalid zone ' + z).to.not.throw();
        }));
    });

    it('name the country its own zone, not a neighbour it shares time with', () => {
        // zone1970.tab collapses countries whose civil time has agreed since
        // 1970 -- DE, DK, NO, SE and SJ all sit on one Europe/Berlin row --
        // so the per-country zone.tab is the source
        expect(country.findByIso2('DK').timezones).to.deep.equal(['Europe/Copenhagen']);
        expect(country.findByIso2('NO').timezones).to.deep.equal(['Europe/Oslo']);
        expect(country.findByIso2('SE').timezones).to.deep.equal(['Europe/Stockholm']);
        expect(country.findByIso2('NL').timezones).to.deep.equal(['Europe/Amsterdam']);
    });

    it('carry every zone for countries that span several', () => {
        expect(country.findByIso2('US').timezones.length).to.be.at.least(20);
        expect(country.findByIso2('RU').timezones.length).to.be.at.least(20);
        expect(country.findByIso2('AU').timezones).to.include('Australia/Sydney');
    });

    it('are absent only for the uninhabited territories', () => {
        expect(all.filter(c => country.findByIso2(c).timezones === undefined))
            .to.deep.equal(['BV', 'HM']);
    });
});

describe('ISO numeric', () => {
    it('is a zero-padded three-digit string', () => {
        each((c, iso2) => {
            if (c.code.numeric === undefined) return;
            expect(c.code.numeric, iso2).to.match(/^[0-9]{3}$/);
        });
        expect(country.findByIso2('AF').code.numeric).to.equal('004');
        expect(country.findByIso2('DK').code.numeric).to.equal('208');
    });

    it('is unique, and absent only for Kosovo', () => {
        const codes = all.map(c => country.findByIso2(c).code.numeric).filter(Boolean);
        expect(new Set(codes).size, 'duplicate numeric codes').to.equal(codes.length);
        expect(all.filter(c => country.findByIso2(c).code.numeric === undefined))
            .to.deep.equal(['XK']);      // user-assigned, tzdb and ISO give it no number
    });
});

describe('the remaining added fields', () => {
    it('native_name is a non-empty string that differs from name', () => {
        each((c, iso2) => {
            if (c.native_name === undefined) return;
            expect(c.native_name, iso2).to.be.a('string').and.not.equal('');
            expect(c.native_name, iso2).to.not.equal(c.name);
        });
        expect(country.findByIso2('DE').native_name).to.equal('Deutschland');
        expect(country.findByIso2('JP').native_name).to.equal('日本');
    });

    it('tld entries start with a dot', () => {
        // internationalized ccTLDs are not ASCII: Kazakhstan has .қаз
        // alongside .kz, and several others carry native-script domains
        each((c, iso2) => (c.tld || []).forEach(t => {
            expect(t, iso2).to.be.a('string');
            expect(t[0], iso2 + ' tld ' + t).to.equal('.');
            expect(t.length, iso2 + ' tld ' + t).to.be.greaterThan(1);
        }));
        expect(country.findByIso2('DK').tld).to.deep.equal(['.dk']);
        expect(country.findByIso2('KZ').tld).to.include('.қаз');

        // right-to-left ccTLDs still lead with the dot in logical order, even
        // though a terminal renders it on the right
        expect(country.findByIso2('DZ').tld).to.include('.\u0627\u0644\u062c\u0632\u0627\u0626\u0631');
    });

    it('area is a positive number', () => {
        each((c, iso2) => {
            if (c.area === undefined) return;
            expect(c.area, iso2).to.be.a('number').and.greaterThan(0);
        });
        expect(country.findByIso2('RU').area).to.be.greaterThan(
            country.findByIso2('CA').area);
    });

    it('latlng is a plausible coordinate pair', () => {
        each((c, iso2) => {
            if (c.latlng === undefined) return;
            expect(c.latlng, iso2).to.be.an('array').with.lengthOf(2);
            expect(c.latlng[0], iso2 + ' latitude').to.be.within(-90, 90);
            expect(c.latlng[1], iso2 + ' longitude').to.be.within(-180, 180);
        });
    });

    it('languages are ISO 639 codes', () => {
        each((c, iso2) => (c.languages || []).forEach(l =>
            expect(l, iso2).to.match(/^[a-z]{2,3}$/)));
        expect(country.findByIso2('CH').languages).to.include.members(['de', 'fr', 'it']);
    });

    it('demonym is a non-empty string', () => {
        each((c, iso2) => {
            if (c.demonym === undefined) return;
            expect(c.demonym, iso2).to.be.a('string').and.not.equal('');
        });
        expect(country.findByIso2('DK').demonym).to.equal('Danish');
    });

    it('every added field covers most of the list', () => {
        const min = {iso_numeric: 249, native_name: 130, demonym: 230,
                     languages: 230, tld: 230, area: 225, latlng: 230,
                     timezones: 245, borders: 160};
        const count = f => f === 'iso_numeric'
            ? all.filter(c => country.findByIso2(c).code.numeric !== undefined).length
            : withField(f).length;
        for (const [f, n] of Object.entries(min))
            expect(count(f), f + ' coverage dropped').to.be.at.least(n);
    });

    it('does not carry population', () => {
        // deliberately not imported: it changes every year and there is no
        // story for keeping 250 figures current
        each((c, iso2) => expect(c, iso2).to.not.have.property('population'));
    });
});
