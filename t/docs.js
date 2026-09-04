'use strict';

// The demo page is tested, because the last one rotted silently: it loaded a
// bundle from rawgit (shut down in 2019) and called `new Country` and
// `country.find(q, opt)`, an API that had not existed for years. Nobody
// noticed, because nothing checked.
//
// The page is run here against a DOM shim small enough to be honest about:
// exactly the handful of methods it touches. It is not a browser, but it does
// catch the failure that actually happened -- a page that renders nothing.

const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'docs', 'index.html'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist', 'country.min.js'), 'utf8');

class El {
    constructor(tag) {
        this.tagName = (tag || 'div').toUpperCase();
        this._html = '';
        this._text = '';
        this.dataset = {};
        this.value = '';
        this.attrs = {};
    }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this._html = String(v); }
    get textContent() { return this._text || this._html.replace(/<[^>]+>/g, ''); }
    set textContent(v) { this._text = this._html = String(v); }
    insertAdjacentHTML(_, h) { this._html += h; }
    addEventListener(type, fn) { this.handlers = (this.handlers || 0) + 1; wired.push([this, type, fn]); }
    setAttribute(k, v) { this.attrs[k] = v; }
    removeAttribute(k) { delete this.attrs[k]; }
    closest() { return null; }
    scrollIntoView() {}
}

let wired = [];
let nodes = {};

function run() {
    wired = [];
    nodes = {};
    for (const id of [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))
        nodes['#' + id] = new El('div');
    nodes['#table tbody'] = new El('tbody');

    const document = {
        head: new El('head'),
        querySelector: s => nodes[s] || (nodes[s] = new El('div')),
        querySelectorAll: () => [],
        createElement: t => new El(t),
        getElementById: id => nodes['#' + id] || new El('div'),
    };

    const sandbox = {
        console, Intl, document, String, Set, Array, Object, JSON, Number, Math, RegExp, Date,
        navigator: {clipboard: {writeText: () => Promise.resolve()}},
        setTimeout: fn => fn(),
        clearTimeout: () => {},
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);

    vm.runInContext(bundle, sandbox, {filename: 'dist/country.min.js'});

    const script = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].pop()[1];
    vm.runInContext(script, sandbox, {filename: 'docs/index.html'});
    return sandbox;
}

const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('docs page', () => {
    let sandbox;
    before(() => { sandbox = run(); });

    it('runs against the bundle without throwing', () => {
        expect(sandbox.country, 'the bundle defined no global').to.be.an('object');
    });

    it('renders a result on load', () => {
        const out = strip(nodes['#results'].innerHTML);
        expect(out).to.include('Denmark');
        expect(out).to.include('Copenhagen');
    });

    it('names the finder that answered, and the exact call', () => {
        // 'Denmark' misses findByIso2 and findByIso3, then findByName answers
        expect(nodes['#results'].innerHTML).to.include('findByName');
        expect(nodes['#results'].innerHTML).to.include('country.<b>findByName</b>');
    });

    it('shows the fields added in 4.0', () => {
        const out = strip(nodes['#results'].innerHTML);
        for (const f of ['Native name', 'Demonym', 'Domain', 'Time zones', 'Borders', 'Coordinates'])
            expect(out, f).to.include(f);
    });

    it('draws a flag from the ISO-2 code, with no image assets', () => {
        expect(nodes['#results'].innerHTML).to.match(/[\uD83C][\uDDE6-\uDDFF]/);
    });

    it('counts its own statistics rather than hardcoding them', () => {
        const stats = strip(nodes['#stats'].innerHTML);
        const country = sandbox.country;
        expect(stats).to.include(String(Object.keys(country.all).length));
        expect(stats).to.include(String(country.continents().length) + ' continents');
        expect(stats).to.include('0 runtime dependencies');
    });

    it('lists every country in the table', () => {
        const rows = (nodes['#table tbody'].innerHTML.match(/<tr/g) || []).length;
        expect(rows).to.equal(Object.keys(sandbox.country.all).length);
    });

    it('populates the chips and the continent filter', () => {
        expect((nodes['#chips'].innerHTML.match(/class="chip"/g) || []).length).to.be.at.least(6);
        expect((nodes['#continent'].innerHTML.match(/<option/g) || []).length)
            .to.equal(sandbox.country.continents().length);
    });

    it('wires up its interactions', () => {
        expect(wired.length, 'no event handlers registered').to.be.at.least(6);
    });

    it('has no dead references left from the old page', () => {
        for (const dead of ['rawgit', 'now.sh', 'new Country', 'iso_alpha_2', 'travis'])
            expect(html, dead).to.not.include(dead);
    });

    it('falls back to the CDN when the local bundle is absent', () => {
        expect(html).to.include('unpkg.com/country-list-js');
    });
});
