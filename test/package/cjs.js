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
const DECLARED = new Set(['BY','ES','NG','ET','TR','VN','HR','LT','BG','VE','MR','ST','SL','ZW','ZM']);
const restrict = (a, e) => {
    if (Array.isArray(e)) return Array.isArray(a) ? a.map((v,i)=>restrict(v,e[i])) : a;
    if (e && typeof e === 'object' && a && typeof a === 'object') {
        const o = {}; for (const k of Object.keys(e)) o[k] = restrict(a[k], e[k]); return o;
    }
    return a;
};
// currency.decimal became a number; migrate the baseline rather than
// exempting all 250 countries from the comparison
const migrate = c => { c.currency.decimal = Number(c.currency.decimal); return c; };
const undeclared = [];
for (const iso2 of Object.keys(old.all)) {
    const e = migrate(old.findByIso2(iso2)), a = now.findByIso2(iso2);
    if (JSON.stringify(e) !== JSON.stringify(restrict(a, e)) && !DECLARED.has(iso2))
        undeclared.push(iso2);
}
assert.deepStrictEqual(undeclared, [], 'undeclared country differences: ' + undeclared);
checks++;

// 3. list functions unchanged
for (const fn of ['names', 'capitals', 'continents']) {
    assert.deepStrictEqual(now[fn](), old[fn](), fn + '()'); checks++;
}
assert.deepStrictEqual(now.ls('region'), old.ls('region'), "ls('region')"); checks++;

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
ok('findByProvince twice', now.findByProvince('Nordjylland').name === 'Denmark');
const p290 = now.findByPhoneNbr('+2901234');
ok('+290 has no holes', p290 && !Array.isArray(p290) && p290.name === 'Saint Helena');
ok('findByPhoneNbr(null) does not throw', now.findByPhoneNbr(null) === undefined);
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
ok('alias', now.findByName('Türkiye').name === 'Turkey');
ok('case-insensitive', now.findByIso2('dk').name === 'Denmark');
ok('retired currency', now.findByCurrency('HRK').name === 'Croatia');
ok('Bulgaria is on the euro', now.findByIso2('BG').currency.code === 'EUR');
ok('longest prefix wins', now.findByPhoneNbr('+12465551212').name === 'Barbados');
ok('decimal is a number', typeof now.findByIso2('DK').currency.decimal === 'number');

console.log('CJS: %d checks passed', checks);
