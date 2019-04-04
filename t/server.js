const assert = require('assert').strict;
const micro = require('micro');
const listen = require('test-listen');
const request = require('request-promise');
const server = require('../server');

function call(url) {
    return request({ url, method: 'GET', json: true })
	.catch(e => {
		console.log('REQUEST FAIL', e)	
	})
}

describe('Server fetches', () => {
	var service, url
	beforeEach(async () => {
		service = micro(server)
		url = await listen(service)		
	})
	afterEach(() => {
		service.close()
	})

	it('niladic method', async () => {
        var actual = await call(url + '/?method=continents')
        var expected = ["Asia","Europe","Africa","North America","Oceania","South America","Antarctica"]
		assert.deepEqual(actual, expected)
	})
    it('monadic method', async () => {
		var actual = await call(url + '/?method=findByIso2&code=DK')
		var expected = { 
			name: 'Denmark',
			continent: 'Europe',
			region: 'Scandinavia, Nordic Countries',
			capital: 'Copenhagen',
			currency: { code: 'DKK', symbol: 'Dkr', decimal: '2' },
			dialing_code: '45',
			provinces:
			[ { name: 'Hovedstaden', alias: null },
			{ name: 'Midtjylland', alias: null },
			{ name: 'Nordjylland', alias: null },
			{ name: 'Sjælland', alias: [ 'Zealand' ] },
			{ name: 'Syddanmark', alias: null } ],
			code: { iso2: 'DK', iso3: 'DNK' } 
		}
		assert.deepEqual(actual, expected)
    })
})