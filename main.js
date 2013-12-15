var request = require('request');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var Q = require('q');

//var opts = {
//    method: 'GET',
//    uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
//    encoding: null
//}
//request(opts, function processFetchRootResponse(error, response, body) {
//    if (!error && response.statusCode == 200) {
//        var strBody = iconv.decode(body, 'iso-8859-1');
//        var $ = cheerio.load(strBody);
//        var week = {};
//        week.code = $('input[name=selSemana]').attr('value');
//        week.name = $('input[name=desc_Semana]').attr('value');
//        var states = [];
//        var fuels = [];
//        $('select[name=selEstado]>option').each(function extractState() {
//            var state = {};
//            state.code = $(this).attr('value');
//            state.name = $(this).text();
//            states.push(state);
//        });
//        $('select[name=selCombustivel]>option').each(function extractFuel() {
//            var fuel = {};
//            fuel.code = $(this).attr('value');
//            fuel.name = $(this).text();
//            fuels.push(fuel);
//        });
//        console.log(strBody);
//    }
//});

function AnpCrawler() {
    var week = {};
    var states = [];
    var fuels = [];
    this.fetchRoot = function _fetchRoot() {
        var opts = {
            method: 'GET',
            uri: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
            encoding: null
        };
        var deferred = Q.defer();
        request(opts, function _fetchRoot(error, response, body) {
            if (!error && response.statusCode == 200) {
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
                var wsf = [];
                for (var i = 0; i < fuels.length; i++) {
                    for (var j = 0; j < states.length; j++) {
                        wsf.push({ week: crawler.getWeek(), state: states[j], fuel: fuels[i] });
                    }
                }
                deferred.resolve(wsf);
            } else if (error) {
                deferred.reject(new Error(error));
            } else {
                deferred.reject(new Error('statusCode=' + response.statusCode));
            }
        });
        return deferred.promise;
    };
    this.fetchCities = function _fetchCities(obj, state, fuel) {
        console.log('fetchCities ' + JSON.stringify(arguments));
        var week;
        if (!state && !fuel) {
            week = obj.week;
            state = obj.state;
            fuel = obj.fuel;
        } else {
            week = obj;
        }
        console.log(week);
//        console.log(week.code);
//        console.log(state.code);
//        console.log(fuel.code);
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
}

var crawler = new AnpCrawler();

Q.all(crawler.fetchRoot())
    .then(crawler.fetchCities)
//    .then(function (msg) {
//        console.log(msg);
//    })
    .done();