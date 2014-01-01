var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var Q = require('q');

function rootOpts() {
    return {
        method: 'GET',
        uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
        encoding: null,
        followRedirect: false
    };
}

function parseRoot(emitter, response) {
    var statusCode = response[0].statusCode;
    if (statusCode !== 200) {
        throw new Error("strategy: parseRoot: statusCode = " + statusCode);
    }
    var body = response[0].body;
    var strBody = iconv.decode(body, 'iso-8859-1');
    var $ = cheerio.load(strBody);
    var event = {
        week: {},
        states: [],
        fuels: []
    };
    event.week.code = $('input[name=selSemana]').attr('value');
    event.week.name = $('input[name=desc_Semana]').attr('value');
    $('select[name=selEstado]>option').each(function extractState() {
        var state = {};
        state.code = $(this).attr('value');
        state.name = $(this).text();
        event.states.push(state);
    });
    $('select[name=selCombustivel]>option').each(function extractFuel() {
        var fuel = {};
        fuel.code = $(this).attr('value');
        fuel.name = $(this).text();
        event.fuels.push(fuel);
    });
    emitter.emit('root.fetched', event);
}

function citiesOpts(week, fuel, state) {
    var weekCode = week.code ? week.code : week;
    var fuelCode = fuel.code ? fuel.code : fuel;
    var stateCode = state.code ? state.code : state;
    return {
        method: 'POST',
        uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
        encoding: null,
        followRedirect: false,
        form: {
            'selSemana': weekCode,
            'selEstado': stateCode,
            'selCombustivel': fuelCode,
            'image1': ''
        }
    };
}

function parseCities(emitter, week, fuel, state, response) {
    var statusCode = response[0].statusCode;
    if (statusCode !== 200) {
        throw new Error("strategy: parseCities: statusCode = " + statusCode);
    }
    var body = response[0].body;
    var strBody = iconv.decode(body, 'iso-8859-1');
    var $ = cheerio.load(strBody);
    $('#box td>a').each(function extractCity() {
        var cityHref = $(this).attr('href');
        var city = {};
        city.code = cityHref.slice(cityHref.indexOf("'") + 1, cityHref.lastIndexOf("'"));
        city.name = $(this).text().trim();
        city.state = state;
        emitter.emit('city.fetched', {
            "week": week,
            "city": city,
            "fuel": fuel
        });
    });
}

function pricesOpts(week, fuel, city) {
    return {
        method: 'POST',
        uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Municipio_Posto.asp',
        encoding: null,
        followRedirect: false,
        form: {
            'Tipo': '2',
            'selSemana': week.code,
            'desc_Semana': '',
            'selMunicipio': city.code,
            'selCombustivel': fuel.code,
            'image1': ''
        }
    };
}

var defaultFields = ['name', 'street', 'neighborhood', 'brand', 'sellingPrice', 'cost', 'purchaseMode', 'supplier', 'date'];
var glpFields = ['name', 'street', 'neighborhood', 'distributor', 'sellingPrice', 'cost', 'purchaseMode', 'date'];

function parsePrices(emitter, week, fuel, city, response) {
    var statusCode = response[0].statusCode;
    if (statusCode !== 200) {
        throw new Error("strategy: parsePrices: statusCode = " + statusCode);
    }
    var body = response[0].body;
    var strBody = iconv.decode(body, 'iso-8859-1');
    var $ = cheerio.load(strBody);
    var i = 0;
    var station = {
        address: {}
    };
    var fields = (fuel.code === '462*GLP') ? glpFields : defaultFields;
    $('#postos_nota_fiscal > div > table td').each(function processTableCell() {
        if (fields[i] === 'street' || fields[i] === 'neighborhood') {
            station.address[fields[i]] = $(this).text().trim();
        } else {
            station[fields[i]] = $(this).text().trim();
        }
        station.address.city = city;
        station.address.normalizedAddress = normalizeAddress(station.address);
        i++;
        if (i >= fields.length) {
            emitter.emit('price.fetched', {
                "week": week,
                "fuel": fuel,
                "city": city,
                "station": station
            });
            i = 0;
            station = {
                address: {}
            };
        }
    });
}

function normalizeAddress(address) {
    var result = address.street + ', ' + address.city.name + ', ' + address.city.state.name;
    return result.replace(/ +/g, ' ');
}

exports.fetchRoot = function _fetchRoot(emitter) {
    return {
        opts: rootOpts(),
        parser: parseRoot.bind(null, emitter)
    };
};

exports.fetchCities = function _fetchCities(emitter, week, fuel, state) {
    return {
        opts: citiesOpts(week, fuel, state),
        parser: parseCities.bind(null, emitter, week, fuel, state)
    };
};

exports.fetchPrices = function _fetchPrices(emitter, week, fuel, city) {
    return {
        opts: pricesOpts(week, fuel, city),
        parser: parsePrices.bind(null, emitter, week, fuel, city)
    };
};
