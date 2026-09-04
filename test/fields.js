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
        // Hans Island was divided in 2022, so Canada and Greenland share a land border
        expect(country.findByIso2('CA').borders).to.have.members(['GL', 'US']);
        // the island of Saint Martin is shared by two territories in the list
        expect(country.findByIso2('MF').borders).to.deep.equal(['SX']);
        // borders are de facto: India's claim across Gilgit-Baltistan is not one
        expect(country.findByIso2('AF').borders).to.not.include('IN');
        expect(country.findByIso2('KW').borders).to.deep.equal(['IQ', 'SA']);
        expect(country.findByIso2('RS').borders).to.not.include('AL');
        expect(country.findByIso2('CY').borders).to.equal(undefined);
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

    it('are the tz database\'s zone.tab rows for the country, plus one for Kosovo', () => {
        // zone.tab has no row for XK: Kosovo is user-assigned in ISO 3166-1.
        // It keeps Central European Time with Serbia.
        expect(country.findByIso2('XK').timezones).to.deep.equal(['Europe/Belgrade']);
        expect(country.findByIso2('AQ').timezones).to.include('Antarctica/Troll');
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
        expect(country.findByIso2('XK').code.iso3).to.equal('XKX');   // user-assigned; the form the EU and IMF use
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
        // several official languages are joined with ' / ', in the order of `languages`
        expect(country.findByIso2('CH').native_name).to.equal('Schweiz / Suisse / Svizzera / Svizra');
        // English-only countries have none, and neither does a country whose
        // name is the same in its own language
        for (const iso2 of ['US', 'GB', 'AU', 'CA', 'FR', 'PT', 'AR', 'ZM'])
            expect(country.findByIso2(iso2).native_name, iso2).to.equal(undefined);
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

    it('does not carry area', () => {
        // deliberately not carried: no two sources agree on what a country's
        // area includes, and a number nobody can check is not data
        each((c, iso2) => expect(c, iso2).to.not.have.property('area'));
    });

    it('latlng is a plausible coordinate pair', () => {
        each((c, iso2) => {
            if (c.latlng === undefined) return;
            expect(c.latlng, iso2).to.be.an('array').with.lengthOf(2);
            expect(c.latlng[0], iso2 + ' latitude').to.be.within(-90, 90);
            expect(c.latlng[1], iso2 + ' longitude').to.be.within(-180, 180);
        });
    });

    it('languages are ISO 639 codes, two letters where the language has them', () => {
        each((c, iso2) => (c.languages || []).forEach(l =>
            expect(l, iso2).to.match(/^[a-z]{2,3}$/)));
        expect(country.findByIso2('CH').languages).to.deep.equal(['de', 'fr', 'it', 'rm']);
        expect(country.findByIso2('ME').languages).to.deep.equal(['cnr']);   // no two-letter code
        expect(country.findByIso2('RS').languages).to.deep.equal(['sr']);    // was 'rs', which is nothing
        expect(country.findByIso2('AW').languages).to.deep.equal(['nl', 'pap']);  // was 'pa', Punjabi
        expect(country.findByIso2('FJ').languages).to.deep.equal(['en', 'fj', 'hif']);
        expect(country.findByIso2('ZA').languages).to.have.lengthOf(12);
    });

    it('region and continent follow the UN M49 geoscheme', () => {
        const CONTINENT = {
            'Northern Africa': 'Africa', 'Eastern Africa': 'Africa', 'Middle Africa': 'Africa',
            'Southern Africa': 'Africa', 'Western Africa': 'Africa',
            'Caribbean': 'North America', 'Central America': 'North America',
            'Northern America': 'North America', 'South America': 'South America',
            'Central Asia': 'Asia', 'Eastern Asia': 'Asia', 'South-eastern Asia': 'Asia',
            'Southern Asia': 'Asia', 'Western Asia': 'Asia',
            'Eastern Europe': 'Europe', 'Northern Europe': 'Europe',
            'Southern Europe': 'Europe', 'Western Europe': 'Europe',
            'Australia and New Zealand': 'Oceania', 'Melanesia': 'Oceania',
            'Micronesia': 'Oceania', 'Polynesia': 'Oceania', 'Antarctica': 'Antarctica',
        };
        each((c, iso2) => {
            expect(CONTINENT, iso2 + ' region ' + c.region).to.have.property(c.region);
            expect(c.continent, iso2 + ' continent').to.equal(CONTINENT[c.region]);
        });
        // the ones M49 places where geography, not politics, puts them
        expect(country.findByIso2('CY').region).to.equal('Western Asia');
        expect(country.findByIso2('TF').region).to.equal('Eastern Africa');
        expect(country.findByIso2('CC').region).to.equal('Australia and New Zealand');
        expect(country.findByIso2('MX').region).to.equal('Central America');
        expect(country.findByIso2('RU').region).to.equal('Eastern Europe');
        // the two M49 does not code: Taiwan and Kosovo
        expect(country.findByIso2('TW').region).to.equal('Eastern Asia');
        expect(country.findByIso2('XK').region).to.equal('Southern Europe');
    });

    it('area codes are carried only under a shared calling code', () => {
        each((c, iso2) => {
            if (c.area_codes === undefined) return;
            expect(c.dialing_code, iso2).to.be.a('string');
            const holders = all.filter(k => country.findByIso2(k).dialing_code === c.dialing_code);
            expect(holders.length, iso2 + ' has area codes but +' + c.dialing_code + ' is not shared')
                .to.be.greaterThan(1);
            for (const a of c.area_codes) expect(a, iso2).to.match(/^[0-9]+$/);
        });
        expect(country.findByIso2('AG').dialing_code).to.equal('1');
        expect(country.findByIso2('AG').area_codes).to.deep.equal(['268']);
        expect(country.findByIso2('DO').area_codes).to.deep.equal(['809', '829', '849']);
        expect(country.findByIso2('SX').dialing_code).to.equal('1');       // NANP since 2011
        expect(country.findByIso2('JE').area_codes).to.deep.equal(['1534']);
        expect(country.findByIso2('KZ').area_codes).to.deep.equal(['6', '7']);
        expect(country.findByIso2('DK').area_codes).to.equal(undefined);
        expect(country.findByIso2('US').area_codes).to.equal(undefined);
    });

    it('tld is what the IANA root delegates', () => {
        // .uk is delegated and .gb is reserved; .bl, .bq, .eh, .mf and .um
        // are assigned in ISO 3166 but were never delegated
        expect(country.findByIso2('GB').tld).to.deep.equal(['.uk']);
        for (const iso2 of ['BL', 'BQ', 'EH', 'MF', 'UM', 'XK'])
            expect(country.findByIso2(iso2).tld, iso2).to.equal(undefined);
        expect(country.findByIso2('AF').tld).to.deep.equal(['.af']);   // .افغانستان was never delegated
        expect(country.findByIso2('IN').tld).to.have.lengthOf(16);
    });

    it('demonym is a non-empty string', () => {
        each((c, iso2) => {
            if (c.demonym === undefined) return;
            expect(c.demonym, iso2).to.be.a('string').and.not.equal('');
        });
        expect(country.findByIso2('DK').demonym).to.equal('Danish');
    });

    it('every added field covers most of the list', () => {
        const min = {iso_numeric: 249, native_name: 145, demonym: 240,
                     languages: 247, tld: 244, latlng: 250,
                     timezones: 248, borders: 165};
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
