var _ = require('underscore')
	, request = require('request')
	, cheerio = require('cheerio')
	, iconv = require('iconv-lite');

var crawler = {};
var FuelQuotationProvider = require('./quotationprovider').FuelQuotationProvider;

var quotationProvider= new FuelQuotationProvider('localhost', 27017);

crawler.fields = ['name', 'street', 'neighborhood', 'brand', 'sellingPrice', 'cost', 'purchaseMode', 'supplier', 'date'];
crawler.glpFields = ['name', 'street', 'neighborhood', 'distributor', 'sellingPrice', 'cost', 'purchaseMode', 'date'];
crawler.initialize = function crawlerFetchRoot(processRoot) {
	var opts = {
		method: 'GET'
		, uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp'
		, encoding: null
	}
	request(opts, function processFetchRootResponse(error, response, body) {
		if (!error && response.statusCode == 200) {
			var strBody = iconv.decode(body, 'iso-8859-1');
			var $ = cheerio.load(strBody);
			var week = {};
			week.code = $('input[name=selSemana]').attr('value');
			week.name = $('input[name=desc_Semana]').attr('value');
			var states = [];
			var fuels = [];
			$('select[name=selEstado]>option').each(function extractState() {
				var state = {};
				state.code = $(this).attr('value');
				state.name = $(this).text();
				states.push(state);
			});
			$('select[name=selCombustivel]>option').each(function extractFuel() {
				var fuel = {};
				fuel.code = $(this).attr('value');
				fuel.name = $(this).text();
				fuels.push(fuel);
			});
			crawler.week = week;
			crawler.states = states;
			crawler.fuels = fuels;
			processRoot(crawler);
		}
	});	
}
crawler.fetchCities = function crawlerFetchCities(week, state, fuel, processCity) {
	var opts = {
		method: 'POST'
		, uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp'
		, encoding: null
		, form: {
			'selSemana': week.code
			, 'selEstado': state.code
			, 'selCombustivel': fuel.code
			, 'image1': ''
		}
	}
	request(opts, function processFetchCitiesResponse(error, response, body) {
		if (!error && response.statusCode == 200) {
			var strBody = iconv.decode(body, 'iso-8859-1');
			var $ = cheerio.load(strBody);
			$('#box td>a').each(function extractCity () {
				var cityHref = $(this).attr('href');
				var city = {};
				city.code = cityHref.slice(cityHref.indexOf("'") + 1, cityHref.lastIndexOf("'"));
				city.name = $(this).text().trim();
				city.state = state;
				processCity(week, state, fuel, city);
			});
		}
	});	
}
crawler.fetchPrices = function crawlerFetchPrices(week, city, fuel, processStation) {
	var opts = {
		method: 'POST'
		, uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Municipio_Posto.asp'
		, encoding: null
		, form: {
			'Tipo': '2'
			, 'selSemana': week.code
			, 'desc_Semana': ''
			, 'selMunicipio': city.code
			, 'selCombustivel': fuel.code
			, 'image1': ''
		}
	}
	request(opts, function processFetchPricesResponse(error, response, body) {
		if (!error && response.statusCode == 200) {
			var strBody = iconv.decode(body, 'iso-8859-1');
			var $ = cheerio.load(strBody);
			var i = 0;
			var station = { address: {} };
			var fields = (fuel.code === '462*GLP') ? crawler.glpFields : crawler.fields;
			$('#postos_nota_fiscal > div > table td').each(function processTableCell () {
				//console.log(crawler.fields[i] + ': ' + $(this).text());
				if (fields[i] === 'street' || fields[i] === 'neighborhood') {
					station.address[fields[i]] = $(this).text().trim();
				} else {
					station[fields[i]] = $(this).text().trim();
				}
				station.address.city = city;
				station.normalizedAddress = crawler.normalizeAddress(station.address);
				i++;
				if (i >= fields.length) {
					processStation(week, city, fuel, station);
					i = 0;
					station = { address: {} };
				}
			});
		}
	});
};
crawler.normalizeAddress = function crawlerNormalizeAddress(address) {
	return address.street + ', ' + address.city.name + ', ' + address.city.state.name;
}

crawler.initialize(populate);

function populate(crawler) {
	//console.log(crawler);
	_.each(crawler.states, function iterateFuel(state) {
		//if (state.code != 'SP*SAO@PAULO') return;
		_.each(crawler.fuels, function fetchCities(fuel) {
			crawler.fetchCities(crawler.week, state, fuel, function processCity(week, state, fuel, city) {
				//if (city.code != '9005*CACAPAVA') return;
				//console.log(week + ' ' + JSON.stringify(fuel) + ' ' + JSON.stringify(city));
				//console.log(week.code + ' ' + city.code + ' ' + fuel.code);
				//crawler.fetchPrices('743*', '4522*ABAETETUBA', '487*', function processStation(week, city, fuel, station) {
				//	console.log('week=' + week + ' city=' + city + ' fuel=' + fuel + 'station=' + JSON.stringify(station));
				//});
				var fuelDescription = fuel.code;
				var code = fuelDescription.match(/^[0-9]{3}/g);
				crawler.fetchPrices(week, city, fuel, function processStation(week, city, fuel, station) {
					//console.log('{\"week\": \"' + week.code + '\", \"city\":\"' + city.code + '\", \"fuel\": \"' + code + '\", \"station\": [' + JSON.stringify(station) + ']}');
					var quotation = {week: week.code, city: city.code , fuel: code[0] ,station: station };
					quotationProvider.save(quotation,function (error, docs){
						if(error){
							console.log(error);
						}
					});
				});

			});
		});
	});
}
/*
crawler.fetchCities('743'
	, { code: 'SP*SAO@PAULO', name: 'Sao Paulo' }
	, { code: '487*Gasolina', name: 'Gasolina' }
	, function processCity(week, state, fuel, city) {
		console.log('week=' + week + ' city=' + JSON.stringify(city));
});
*/
/*
crawler.fetchPrices('743*', '4522*ABAETETUBA', '487*', function processStation(week, city, fuel, station) {
	console.log('week=' + week + ' city=' + city + ' fuel=' + fuel + 'station=' + JSON.stringify(station));
});
*/
