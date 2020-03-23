'use strict';

var self = module.exports = {
    all: {},
    cache: {},
    findByIso2: code => x(self.all[code]),
    findByIso3: code => find('iso3', code),
    findByName: name => find('name', name),
    findByCapital: name => find('capital', name),
    findByCurrency: code => find('currency', code),
    findByProvince(name) {
        if (!self.cache.province) self.cache.province = {};
        if (self.cache.province[name])
            return self.cache.province[name].map(o => x(o));
    
        return self.cache.province[name] = Object.keys(self.all)
            .map(k => self.all[k])
            .filter(o => o.provinces)
            .filter(o => o.provinces.filter(
                o => o.name == name || (o.alias || []).indexOf(name) > -1
              ).length > 0
            )
            .map(o => x(o))
            .unpack(undefined);
    },
    findByPhoneNbr(nbr) {
        // make sure the phone number is clean
        nbr = nbr.replace(/\D/g, '');
        
        // now match prefixes against the phone number
        return phones.filter(o => o.nbr && nbr.startsWith(o.nbr))
            .map(o => x(self.all[o.code]))
            .unpack(undefined);
    },
    ls(field) {
        return Object.keys(this.all).map(k => this.all[k][field]);
    },
    continents() {
        return this.ls('continent').unique();
    },
    names() {
        return this.ls('name');
    },
    capitals() {
        return this.ls('capital');
    }
};

// transform to the old format for backward-compatibility

function x(o) {
    if (!o) return;
    if (Array.isArray(o)) return o.map(x(o));

    var ret = Object.assign({}, o);
    ret.currency = {
        code: ret.currency, 
        symbol: ret.currency_symbol, 
        decimal: ret.currency_decimal
    };
    ret.code = {iso2: ret.iso2, iso3: ret.iso3}
    for (var k of 'iso2|iso3|currency_symbol|currency_decimal'.split('|'))
        delete ret[k];
    return ret;    
}

function find(prop, val) {
    if (!(prop in self.cache)) self.cache[prop] = {};
    if (self.cache[prop][val])
        return self.cache[prop][val];

    return self.cache[prop][val] = Object.keys(self.all)
        .filter(k => self.all[k][prop] == val)
        .map(k => x(self.all[k]))
        .unpack(undefined);
}

var continents = require('./data/continents.json');
var continent = require('./data/continent.json');
var iso_alpha_3 = require('./data/iso_alpha_3.json');
var capital = require('./data/capital.json');
var currency = require('./data/currency.json');
var currency_info = require('./data/currency_info.json');
var names = require('./data/names.json');
var phone = require('./data/phone.json');
var regions = require('./data/regions.json');
var provinces = require('./data/provinces.json');

// compact it into a single object

Object.keys(iso_alpha_3).forEach(function (k) {
    self.all[k] = {
        iso2: k,
        iso3: iso_alpha_3[k],
        name: names[k],
        continent: continents[continent[k]],
        region: regions[k],
        capital: capital[k],
        currency: currency[k],
        currency_symbol: currency_info[currency[k]].symbol,
        currency_decimal: currency_info[currency[k]].decimal,
        dialing_code: phone[k],
        provinces: provinces[k]
    };
});

// release memory (except for phone)

continents = continent = iso_alpha_3 
    = capital = currency = currency_info 
    = names = regions = provinces
    = null;

// phone gets turned into a sorted array

var phones = Object.keys(phone).map(function (k) {
    return {code: k, nbr: phone[k].replace(/\D/g, '')}
})

// we need to match the phone number against the longest
// prefix we can find.  that avoids matching against 1 (US)
// when we should be matching against 1246 (Barbados)

phones.sort((a,b) => a.nbr.length < b.nbr.length ? 1 : -1);
phone = null;

Array.prototype.unpack = function() {
    var l = this.length;
    return l == 1 ? this[0] 
        : l == 0 && arguments.length > 0
        ? undefined
        : this;
}

Array.prototype.unique = function() {
    return this.filter((e, pos) => this.indexOf(e) == pos);
}
