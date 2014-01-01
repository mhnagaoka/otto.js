var Q = require('q');
var crawler = require('./crawler.js');
var anp = require('./anpstrategy.js');
var geo = require('./geocodestrategy.js');
var events = require('events');
var emitter = new events.EventEmitter();

emitter.on('root.fetched', function (event) {
    console.log('root.fetched: ' + event.week.code);
    var state = {
        "code": "SP*SAO@PAULO",
        "name": "Sao Paulo"
    };
    var gas = {
        "code": "487*Gasolina",
        "name": "Gasolina"
    };
    var eth = {
        "code": "643*Etanol",
        "name": "Etanol"
    };
    crawler.crawl(anp.fetchCities(emitter, event.week, gas, state));
    crawler.crawl(anp.fetchCities(emitter, event.week, eth, state));
});

var cityCodesOfInterest = [];
//cityCodesOfInterest.push('9668*SAO@PAULO');
//cityCodesOfInterest.push('9025*CAMPINAS');
cityCodesOfInterest.push('8961*BAURU');
//cityCodesOfInterest.push('9005*CACAPAVA');

emitter.on('city.fetched', function (event) {
    console.log(event.city.code, event.city.name);
    if (cityCodesOfInterest.indexOf(event.city.code) >= 0) {
        crawler.crawl(anp.fetchPrices(emitter, event.week, event.fuel, event.city));
    }
});

var count = 0;

emitter.on('price.fetched', function (event) {
    console.log(event.station.address.normalizedAddress, event.fuel.name, event.station.sellingPrice);
    (count < 10) && crawler.crawl(geo.googleMaps(emitter, event.station.address));
    ++count;
});

emitter.on('geolocation.fetched', function (event) {
    console.dir(event.address);
});

emitter.on('geolocation.missing', function (event) {
    console.log('geolocation.missing: %s', event.source);
});

crawler.crawl(anp.fetchRoot(emitter));