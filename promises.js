var Q = require('q');

function getStates() {
    return Q.all(['sp', 'rj'].map(function (st) {
        console.log(st);
        return getCities(st);
    }));
}

function getCities(st) {
    if (st === 'sp') {
        return Q.all(['sao_paulo', 'campinas', 'cacapava'].map(function (ct) {
            console.log(ct);
            var d = Q.defer();
            d.resolve(ct);
            return d.promise;
        }));
    } else if (st == 'rj') {
        return Q.all(['macae'].map(function (ct) {
            console.log(ct);
            var d = Q.defer();
            d.resolve(ct);
            return d.promise;
        }));
    } else {
        var d = Q.defer();
        d.reject('inesperado: st=' + st);
        return d.promise;
    }
}

getStates()
    .then(console.log)
    .done();