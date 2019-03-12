"use strict";

var self = module.exports = {
    all: {},
    cache: {},
    findByIso2: code => x(self.all[code]),
    findByIso3: code => find('iso3', code),
    findByName: name => find('name', name),
    findByCapital: name => find('capital', name),
    findByCurrency: code => find('currency', code),
    findByPhoneNbr(nbr) {
        nbr = nbr.replace(/\D/g, '');   // make sure the phone number is clean
        
        // now match prefixes against the phone number
        for (var i = 0; i < phones.length; i++)
            if (phones[i].nbr && nbr.startsWith(phones[i].nbr))
                return x(self.all[phones[i].code]);
    }
};

// transform to the old format for backward-compatibility

function x(o) {
    if (!o) return;
    var ret = Object.assign({}, o);
    ret.currency = {
        code: ret.currency, 
        symbol: ret.currency_symbol, 
        decimal: ret.currency_decimal
    };
    ret.code = {
        iso_alpha_2: ret.iso2,
        iso_alpha_3: ret.iso3
    }
    for (var k of 'iso2|iso3|currency_symbol|currency_decimal'.split('|'))
        delete ret[k];
    return ret;    
}

function find(prop, val) {
    if (!(prop in self.cache)) self.cache[prop] = {};
    if (self.cache[prop][val])
        return x(self.cache[prop][val]);

    for (var k in self.all)
        if (self.all[k][prop] == val)
            return x(self.cache[prop][val] = self.all[k]);
}

var continents = require('./../data/continents.json');
var continent = require('../data/continent.json');
var iso_alpha_3 = require('../data/iso_alpha_3.json');
var capital = require('../data/capital.json');
var currency = require('../data/currency.json');
var currency_info = require('../data/currency_info.json');
var names = require('../data/names.json');
var phone = require('../data/phone.json');
var regions = require('../data/regions.json');

// compact it into a single object

for (var k in iso_alpha_3)
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
        dialing_code: phone[k]
    };

// release memory (except for phone)

continents = continent = iso_alpha_3 
    = capital = currency = currency_info 
    = names = regions 
    = null;

// phone gets turned into a sorted array
    
var phones = [];
for (var k in phone)
    phones.push({code: k, nbr: phone[k].replace(/\D/g, '')})

// we need to match the phone number against the longest
// prefix we can find.  that avoids matching against 1 (US)
// when we should be matching against 1246 (Barbados)

phones.sort((a,b) => a.nbr.length < b.nbr.length ? 1 : -1);
phone = null;