var Q = require('q');
var crawler = require('../crawler.js');
var geo = require('../geocodestrategy.js');
var events = require('events');
var emitter = new events.EventEmitter();

emitter.on('geolocation.fetched', function (event) {
    console.dir(event.address);
    if (event.source === 'googleMaps') {
        crawler.crawl(geo.bingMaps(emitter, event.address));
    }
});

emitter.on('geolocation.missing', function (event) {
    console.log('geolocation.missing: %s', event.source);
    if (event.source === 'googleMaps') {
        crawler.crawl(geo.bingMaps(emitter, event.address));
    }
});

//var addr = JSON.parse('{"city":{"code":"9025*CAMPINAS","name":"Campinas","state":{"code":"SP*SAO@PAULO","name":"Sao Paulo"}},"normalizedAddress":"Avenida Engenheiro Antonio F. P Souza, 3900, Campinas, Sao Paulo","street":"Avenida Engenheiro Antonio F. P Souza, 3900","neighborhood":"Jardim Vonzubem"}');

var addr = JSON.parse('{"city":{"code":"9668*SAO@PAULO","name":"Sao Paulo","state":{"code":"SP*SAO@PAULO","name":"Sao Paulo"}},"normalizedAddress":"Avenida Miguel Estefano, 690, Sao Paulo, Sao Paulo","street":"Avenida Miguel Estefano, 690","neighborhood":"Saude"}');

var addr2 = JSON.parse('{"city":{"code":"9668*SAO@PAULO","name":"Sao Paulo","state":{"code":"SP*SAO@PAULO","name":"Sao Paulo"}},"normalizedAddress":"Avenida Miguel Estefno, 690, Sao Paulo, Sao Paulo","street":"Avenida Miguel Estefno, 690","neighborhood":"Saude"}');

crawler.crawl(geo.googleMaps(emitter, addr));
crawler.crawl(geo.googleMaps(emitter, addr2));