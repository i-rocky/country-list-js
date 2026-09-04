// Verify the packed tarball as a consumer sees it.
const assert = require('assert');
const now = require('country-list-js');
const old = require('old');

let checks = 0;
const ok = (label, cond) => { assert.ok(cond, label); checks++; };

// 1. the module surface: 3.1.8's members less the ones 4.0 removed
const REMOVED = ['cache'];
ok('12 members', Object.keys(now).length === 12);
assert.deepStrictEqual(Object.keys(now).sort(),
    Object.keys(old).filter(m => !REMOVED.includes(m)).sort(), 'member names');
checks++;
for (const m of REMOVED) ok('removed ' + m, !(m in now));
ok('no default key', !('default' in now));
ok('no __esModule key', !('__esModule' in now));

// 2. every country, every field 3.1.8 returned
// data corrections, plus the eight countries carrying a name they were
// renamed to since 3.1.8 was published
const DECLARED = new Set(['BY','ES','NG','ET','VN','HR','LT','BG','VE','MR','ST','SL','ZW','ZM',
                          'TR','SZ','MK','CZ','CV','CI','TL','VA','GB','US',
                          'PK','CU','ET','ID','IN','MX','BE','BR','CN','DE','IT','NL',
                          'ES','CL','PH','BD',
                          // names, capitals, currencies and dialing codes corrected in 4.0
                          'AX','BL','CW','RE','BQ','CC','PN','PS',
                          'BI','CH','EH','GG','GQ','GS','IM','KI','LK','LY','MM','MN','PW','SG','UA','WF',
                          'AQ','DO','JM','SX','XK','CX','NF','SJ','KZ','RU']);
const restrict = (a, e) => {
    if (Array.isArray(e)) return Array.isArray(a) ? a.map((v,i)=>restrict(v,e[i])) : a;
    if (e && typeof e === 'object' && a && typeof a === 'object') {
        const o = {}; for (const k of Object.keys(e)) o[k] = restrict(a[k], e[k]); return o;
    }
    return a;
};
// The surface-wide breaks, migrated into the baseline rather than exempting
// all 250 countries from the comparison.  test/contract.js states each one.
const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u02bb\u2018\u2019]/g, "'").toLowerCase();
const migrate = c => {
    c.currency = {code: c.currency.code};              // symbol and decimal follow CLDR and ISO 4217
    delete c.region; delete c.continent;               // UN M49
    c.capital = c.capital === '' ? null : fold(c.capital);
    const m = c.dialing_code.trim().match(/^\+?(\d+)(?:-(\d+))?(?: and 1-(\d+))?$/);
    c.dialing_code = m ? m[1] : null;
    if (m) { const a = [m[2], m[3]].filter(Boolean); if (a.length) c.area_codes = a; }
    if (c.provinces) c.provinces = c.provinces.map(p => {
        // 3.1.8 held an alias as an array, a bare string, or nothing at all
        let alias = Array.isArray(p.alias) ? p.alias.filter(a => fold(a) !== fold(p.name))
                  : p.alias == null ? null : p.alias;
        if (Array.isArray(alias) && !alias.length) alias = null;
        return {name: p.name, code: p.short === undefined ? null : p.short,
                region: p.region === undefined ? null : p.region, alias};
    });
    return JSON.parse(JSON.stringify(c));
};
const normalise = a => {
    a = JSON.parse(JSON.stringify(a));
    a.capital = a.capital ? fold(a.capital) : null;
    if (a.dialing_code === undefined) a.dialing_code = null;
    return a;
};
const undeclared = [];
for (const iso2 of Object.keys(old.all)) {
    const e = migrate(old.findByIso2(iso2)), a = normalise(now.findByIso2(iso2));
    const r = restrict(a, e);
    if ('dialing_code' in e && a.area_codes !== undefined) r.area_codes = a.area_codes;
    if (JSON.stringify(e) !== JSON.stringify(r) && !DECLARED.has(iso2))
        undeclared.push(iso2);
}
assert.deepStrictEqual(undeclared, [], 'undeclared country differences: ' + undeclared);
checks++;

// 3. list functions unchanged
// 4.0 orders every list by country name; 3.1.8 used the insertion order of a
// hand-maintained file. Same values, stated order.
const RENAMED = {Turkey:'Türkiye', Swaziland:'Eswatini', Macedonia:'North Macedonia',
    'Czech Republic':'Czechia', 'Cape Verde':'Cabo Verde', 'Ivory Coast':"Côte d'Ivoire",
    'East Timor':'Timor-Leste', Vatican:'Holy See',
    'Aland Islands':'Åland Islands', 'Saint Barthelemy':'Saint Barthélemy', Curacao:'Curaçao',
    Reunion:'Réunion', 'Sao Tome and Principe':'São Tomé and Príncipe',
    'Bonaire, Saint Eustatius and Saba ':'Bonaire, Sint Eustatius and Saba',
    'Cocos Islands':'Cocos (Keeling) Islands', Pitcairn:'Pitcairn Islands',
    'Palestinian Territory':'Palestine'};
const bag = a => [...a].sort();
assert.deepStrictEqual(bag(now.names()), bag(old.names().map(n => RENAMED[n] || n)), 'names()');
checks++;
assert.deepStrictEqual(bag(now.continents()), bag(old.continents()), 'continents()'); checks++;
ok('capitals() is one entry per country', now.capitals().length === old.capitals().length);
ok("ls('region') is the M49 scheme", new Set(now.ls('region')).size === 23);
ok('names() is in name order',
   now.names().every((n, i, a) => i === 0 || a[i-1].localeCompare(n, 'en') <= 0));

// 4. deep imports.  data/ is private in 4.0: the aggregates 3.1.8 shipped are
// gone, and what remains is an implementation detail the exports map blocks.
const fs = require('fs'), path = require('path');
const oldData = fs.readdirSync(path.dirname(require.resolve('old/package.json')) + '/data');
for (const f of oldData) {
    let blocked = false;
    try { require('country-list-js/data/' + f); } catch (e) {
        blocked = e.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED' || e.code === 'MODULE_NOT_FOUND';
    }
    ok('data/' + f + ' is no longer importable', blocked);
}
ok('deep import dist/country.min.js', !!require.resolve('country-list-js/dist/country.min.js'));
ok('deep import package.json', require('country-list-js/package.json').name === 'country-list-js');
ok('deep import index.js', require('country-list-js/index.js') === now);

// 5. the fixes
now.findByProvince('Nordjylland');
ok('findByProvince twice', now.findByProvince('Nordjylland')[0].name === 'Denmark');
const p290 = now.findByPhoneNbr('+2901234');
ok('+290 has no holes', p290.length === 1 && p290[0].name === 'Saint Helena');
ok('findByPhoneNbr(null) does not throw', now.findByPhoneNbr(null).length === 0);
// In a child process, because 3.1.8 is loaded in this one and patches
// Array.prototype enumerably itself -- testing here would measure the baseline,
// not us.
const {execFileSync} = require('child_process');
const probe = execFileSync(process.execPath, ['-e',
    "require('country-list-js');" +
    "const s=[];for(const k in [1,2])s.push(k);" +
    "console.log(JSON.stringify({loop:s,has:['unpack','unique'].filter(p=>p in Array.prototype)}))",
], {cwd: __dirname, encoding: 'utf8'});
const proto = JSON.parse(probe);
ok('does not extend Array.prototype', proto.has.length === 0);
ok('does not appear in for..in over arrays',
    proto.loop.join() === '0,1');
ok('destructuring works', (({names}) => names().length)(now) === 250);
now.findByName('Denmark').name = 'MUTATED';
ok('a mutated result does not affect the next lookup',
    now.findByName('Denmark').name === 'Denmark');

// 6. the additions
ok('borders', now.findByIso2('PT').borders.join() === 'ES');
ok('timezones', now.findByIso2('DK').timezones[0] === 'Europe/Copenhagen');
ok('iso numeric', now.findByIso2('DK').code.numeric === '208');
ok('renamed country carries its current name', now.findByIso2('TR').name === 'Türkiye');
ok('the former name is still an alias', now.findByName('Turkey').name === 'Türkiye');
ok('case-insensitive', now.findByIso2('dk').name === 'Denmark');
ok('retired currency', now.findByCurrency('HRK')[0].name === 'Croatia');
ok('Bulgaria is on the euro', now.findByIso2('BG').currency.code === 'EUR');
ok('longest prefix wins', now.findByPhoneNbr('+12465551212')[0].name === 'Barbados');
ok('a list finder always returns a list',
   ['findByCapital','findByCurrency','findByProvince','findByPhoneNbr']
     .every(f => Array.isArray(now[f]('nope')) && now[f]('nope').length === 0));
ok('a unique finder always returns a country or undefined',
   ['findByIso2','findByIso3','findByName'].every(f => now[f]('nope') === undefined));
ok('decimal is a number', typeof now.findByIso2('DK').currency.decimal === 'number');
ok('area codes', now.findByIso2('AG').dialing_code === '1' && now.findByIso2('AG').area_codes[0] === '268');
ok('area codes split a shared calling code', now.findByPhoneNbr('+18095551212')[0].code.iso2 === 'DO');
ok('diacritics are folded on a miss', now.findByCapital('Bogota')[0].code.iso2 === 'CO');
ok('a territory with no capital has none', now.findByIso2('AQ').capital === undefined);
ok('Antarctica has no currency', now.findByIso2('AQ').currency === undefined);
ok('Object.prototype is not data', now.findByIso2('constructor') === undefined);

console.log('CJS: %d checks passed', checks);
