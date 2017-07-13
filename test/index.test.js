"use strict";

import { expect} from 'chai';
import Country from "./../src/index";

describe('Country', ()=>{

    /**
     * Hold the Country instance
     */
    let country;

    /**
     * Instantiate
     */
    before(()=>{
        country = new Country;
    });

    it('There has to be total of 250 countries', () => {
        expect(Object.keys(country.all()).length).to.be.equal(250);
    });

    it('Find by iso alpha 2', function() {
        validate_result(country.find('BD', country.FIND_BY_ISO_ALPHA_2));
    });

    it('Find by iso alpha 3', function () {
        validate_result(country.find('BGD', country.FIND_BY_ISO_ALPHA_3));
    });

    it('Find by Name', function () {
        validate_result(country.find('Bangladesh', country.FIND_BY_NAME));
    });

    it('Find by capital', function () {
        validate_result(country.find('Dhaka', country.FIND_BY_CAPITAL));
    });
    it('Find by currency', function () {
        validate_result(country.find('BDT', country.FIND_BY_CURRENCY));
    });

    function validate_result(info) {
        expect(Object.keys(info).length).to.be.equal(6);

        expect(info).to.deep.equal({
            continent: "Asia",
            name: "Bangladesh",
            code: {
                iso_alpha_2: "BD",
                iso_alpha_3: "BGD"
            },
            capital: "Dhaka",
            currency: {
                code: "BDT",
                symbol: "Tk",
                decimal: "2"
            },
            dialing_code: "880"
        });
    }

    it('Once the search has been made, the data is cached', function () {
        validate_result(country.info());
        expect(country.info('name')).to.be.equal('Bangladesh');
        expect(country.info('iso_alpha_2')).to.be.equal('BD');
        expect(country.info('iso_alpha_3')).to.be.equal('BGD');
        expect(country.info('continent')).to.be.equal('Asia');
        expect(country.info('capital')).to.be.equal('Dhaka');
        expect(country.info('currency')).to.deep.equal({code: "BDT", symbol: "Tk", decimal: "2"});
        expect(country.info('dialing_code')).to.be.equal('880');
    });

    it('null is returned if not found', function () {
        expect(country.find('XX', country.FIND_BY_ISO_ALPHA_2)).to.be.equal(null);
    });

});