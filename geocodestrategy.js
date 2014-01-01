var iconv = require('iconv-lite');
var Q = require('q');
var _ = require('underscore');
var qconf = require('qconf');
var config = qconf('file://config/bingmaps.json');
var bingMapsKey = config.get('BING_MAPS_KEY');

//
// Google Maps strategy
//

function googleMapsOpts(address) {
    var searchAddress = address.normalizedAddress;
    // Fix search address for Bauru
    if (address.city.name === 'Bauru') {
        searchAddress = searchAddress.replace(/, ([0-9]+) *- *([0-9]+) *,/, ', $1$2,');
    }
    return {
        method: 'GET',
        uri: 'http://maps.google.com/maps/api/geocode/json',
        encoding: null,
        followRedirect: false,
        headers: {
            'Accept': 'application/json'
        },
        qs: {
            'address': searchAddress,
            'language': 'pt-BR',
            'components': 'locality:' + address.city.name + '|administrative_area:' + address.city.state.name,
            'region': 'br',
            'sensor': 'false'
        }
    };
}

function parseGoogleMaps(emitter, address, httpResponse) {
    var statusCode = httpResponse[0].statusCode;
    if (statusCode !== 200) {
        throw new Error("strategy: parseGeocode: statusCode = " + statusCode);
    }
    var body = httpResponse[0].body;
    var strBody = iconv.decode(body, 'utf-8');
    var response = JSON.parse(strBody);
    var result = response.results && response.results.filter(isStreetAddress)[0];
    if (result) {
        var geo = {};
        geo.formattedAddress = result.formatted_address;
        geo.location = [result.geometry.location.lat, result.geometry.location.lng];
        geo.source = 'googleMaps';
        address.geo = geo;
        emitter.emit('geolocation.fetched', {
            address: address,
            source: 'googleMaps'
        });
    } else {
        emitter.emit('geolocation.missing', {
            address: address,
            source: 'googleMaps'
        });
    }
}

function isStreetAddress(googleResult) {
    return googleResult.types && googleResult.types.indexOf('street_address') >= 0;
}

exports.googleMaps = function _googleMaps(emitter, address) {
    return {
        opts: googleMapsOpts(address),
        parser: parseGoogleMaps.bind(null, emitter, address)
    };
};

//
// Bing Maps strategy
//

function bingMapsOpts(address) {
    return {
        method: 'GET',
        uri: 'http://dev.virtualearth.net/REST/v1/Locations',
        encoding: null,
        followRedirect: false,
        headers: {
            'Accept': 'application/json',
            'Accept-Language': 'pt-br, pt;q=0.8, en;q=0.7'
        },
        qs: {
            'countryRegion': 'br',
            'adminDistrict': address.city.state.name,
            'locality': address.city.name,
            'addressLine': address.street,
            'key': bingMapsKey
        }
    };
}

function parseBingMaps(emitter, address, httpResponse) {
    var statusCode = httpResponse[0].statusCode;
    if (statusCode !== 200) {
        throw new Error("strategy: parseGeocode: statusCode = " + statusCode);
    }
    var body = httpResponse[0].body;
    var strBody = iconv.decode(body, 'utf-8');
    var response = JSON.parse(strBody);
    var result = response.resourceSets && flatten(response.resourceSets).filter(isAddress)[0];
    if (result) {
        var geo = {};
        geo.formattedAddress = result.address.formattedAddress;
        geo.location = result.point.coordinates;
        geo.source = 'bingMaps';
        address.geo = geo;
        emitter.emit('geolocation.fetched', {
            address: address,
            source: 'bingMaps'
        });
    } else {
        emitter.emit('geolocation.missing', {
            address: address,
            source: 'bingMaps'
        });
    }
}

function flatten(bingResourceSets) {
    return bingResourceSets.map(function (r) {
        return r.resources;
    }).reduce(function (previous, element, index, arr) {
        element.forEach(function (e) {
            previous.push(e);
        });
        return previous;
    }, []);
}

function isAddress(bingResult) {
    return bingResult.entityType === 'Address';
}

exports.bingMaps = function _bingMaps(emitter, address) {
    return {
        opts: bingMapsOpts(address),
        parser: parseBingMaps.bind(null, emitter, address)
    };
};