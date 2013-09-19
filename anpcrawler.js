var _ = require('underscore')
	, request = require('request')
	, cheerio = require('cheerio')
	, iconv = require('iconv-lite');
var crawler = {};
crawler.fields = ['name', 'address', 'neighborhood', 'brand', 'sellingPrice', 'cost', 'purchaseMode', 'supplier', 'date'];
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
			var week = $('input[name=cod_Semana]').attr('value');
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
			'selSemana': week + '*'
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
				processCity(week, state, fuel, { code: cityHref.slice(cityHref.indexOf("'") + 1, cityHref.lastIndexOf("'"))
					, name: $(this).text().trim() });
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
			, 'selSemana': week
			, 'desc_Semana': ''
			, 'selMunicipio': city
			, 'selCombustivel': fuel
			, 'image1': ''
		}
	}
	request(opts, function processFetchPricesResponse(error, response, body) {
		if (!error && response.statusCode == 200) {
			var strBody = iconv.decode(body, 'iso-8859-1');
			var $ = cheerio.load(strBody);
			var i = 0;
			var station = {};
			$('#postos_nota_fiscal > div > table td').each(function processTableCell () {
				//console.log(crawler.fields[i] + ': ' + $(this).text());
				station[crawler.fields[i]] = $(this).text();
				i++;
				if (i >= crawler.fields.length) {
					processStation(week, city, fuel, station);
					i = 0;
					station = {};
				}
			});
		}
	});
};

crawler.initialize(initialized);

function initialized(crawler) {
	_.each(crawler.states, function iterateFuel(state) {
		_.each(crawler.fuels, function fetchCities(fuel) {
			crawler.fetchCities(crawler.week, state, fuel, function processCity(week, state, fuel, city) {
				city.state = state;
				//console.log(week + ' ' + JSON.stringify(fuel) + ' ' + JSON.stringify(city));
				console.log(week + '* ' + city.code + ' ' + fuel.code);
				//crawler.fetchPrices('743*', '4522*ABAETETUBA', '487*', function processStation(week, city, fuel, station) {
				//	console.log('week=' + week + ' city=' + city + ' fuel=' + fuel + 'station=' + JSON.stringify(station));
				//});
				crawler.fetchPrices(week + '*', city.code, fuel.code, function processStation(week, city, fuel, station) {
					console.log('week=' + week + ' city=' + city + ' fuel=' + fuel + 'station=' + JSON.stringify(station));
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
