var request = require('request');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var Q = require('q');
var _ = require('underscore');
var ttys = require('ttys');
var stdout = ttys.stdout;

function AnpCrawler() {

    var week = {};
    var states = [];
    var fuels = [];
    var pricingResearchParameters = []; // week, fuel, city
    var me = this;

    this.initialize = function _initialize() {
        console.info('Initializing...');
        var opts = {
            method: 'GET',
            uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
            encoding: null,
            followRedirect: false
        };
        var deferred = Q.defer();
        request(opts, function _handleInitializeResponse(error, response, body) {
            if (!error && response.statusCode == 200) {
                parseInitializeResponse(body);
                deferred.resolve(me);
            } else if (error) {
                deferred.reject(new Error(error.message));
            } else {
                deferred.reject(new Error('statusCode=' + response.statusCode));
            }
            console.log('Initialization completed.');
        });
        return deferred.promise;
    };

    this.fetchAllCities = function _fetchAllCities() {
        console.log('Fetching cities...');
        var promises = []
        var w = week;
        states.forEach(function (s) {
            fuels.forEach(function (f) {
                promises.push(me.fetchCities(w, s, f).then(storePricingResearchParameters));
            });
        });
        return Q.all(promises).then(function (result) {
            stdout.write('\r\033[K');
            console.log('Fetching cities completed: ' + pricingResearchParameters.length);
            return result;
        });
    };

    this.fetchAllPrices = function _fetchAllPrices() {
        console.log('Fetching prices...');
        var promises = []
        var w = week;
        var i = 0;
        pricingResearchParameters.forEach(function (p) {
            promises.push(me.fetchPrices(w, p.city, p.fuel).then(function (result) {
                stdout.write('' + ++i);
                stdout.write('\r\033[K');
                return result;
            }));
        });
        return Q.all(promises).then(function (result) {
            stdout.write('\r\033[K');
            console.log('Fetching prices completed.');
            return result;
        });
    };

    this.getWeek = function _getWeek() {
        return week;
    };

    this.getStates = function _getStates() {
        return states;
    };

    this.getFuels = function _getFuels() {
        return fuels;
    };

    this.getPricingResearches = function _getPricingResearches() {
        return pricingResearchParameters;
    };

    function parseInitializeResponse(body) {
        var strBody = iconv.decode(body, 'iso-8859-1');
        var $ = cheerio.load(strBody);
        week.code = $('input[name=selSemana]').attr('value');
        week.name = $('input[name=desc_Semana]').attr('value');
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
    }

    function storePricingResearchParameters(currentParameters) {
        currentParameters.forEach(function (element) {
            this.push(element);
        }, pricingResearchParameters);
        stdout.write('\r\033[K' + pricingResearchParameters.length);
        return currentParameters;
    };
}

AnpCrawler.prototype.fetchCities = function _fetchCities(week, state, fuel) {

    var opts = {
        method: 'POST',
        uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
        encoding: null,
        followRedirect: false,
        form: {
            'selSemana': week.code,
            'selEstado': state.code,
            'selCombustivel': fuel.code,
            'image1': ''
        }
    }
    var promises = [];
    var deferred = Q.defer();
    request(opts, function processFetchCitiesResponse(error, response, body) {
        if (!error && response.statusCode == 200) {
            var strBody = iconv.decode(body, 'iso-8859-1');
            var $ = cheerio.load(strBody);
            $('#box td>a').each(function extractCity() {
                var cityHref = $(this).attr('href');
                var city = {};
                city.code = cityHref.slice(cityHref.indexOf("'") + 1, cityHref.lastIndexOf("'"));
                city.name = $(this).text().trim();
                city.state = state;
                promises.push({
                    "week": week,
                    "fuel": fuel,
                    "city": city
                });
            });
            deferred.resolve(Q.all(promises));
        } else if (error) {
            deferred.reject(new Error(error.message));
        } else {
            deferred.reject(new Error('statusCode=' + response.statusCode));
        }
    });
    return deferred.promise;
};

AnpCrawler.prototype.fetchPrices = function _fetchPrices(week, city, fuel) {

    var defaultFields = ['name', 'street', 'neighborhood', 'brand', 'sellingPrice', 'cost', 'purchaseMode', 'supplier', 'date'];
    var glpFields = ['name', 'street', 'neighborhood', 'distributor', 'sellingPrice', 'cost', 'purchaseMode', 'date'];

    var opts = {
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

    var promises = [];
    var deferred = Q.defer();
    request(opts, function processFetchPricesResponse(error, response, body) {
        if (!error && response.statusCode == 200) {
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
                station.normalizedAddress = normalizeAddress(station.address);
                i++;
                if (i >= fields.length) {
                    promises.push({
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
            deferred.resolve(Q.all(promises));
        } else if (error) {
            deferred.reject(new Error(error.message));
        } else {
            deferred.reject(new Error('statusCode=' + response.statusCode));
        };
    });
    return deferred.promise;
};

function normalizeAddress(address) {
    return address.street + ', ' + address.city.name + ', ' + address.city.state.name;
}

var crawler = new AnpCrawler();

crawler.initialize()
    .then(crawler.fetchAllCities)
    .then(crawler.fetchAllPrices)
    .then(function (result) {
        return _.flatten(result);
    })
    .then(console.log)
    .done();