var Q = require('q');

function getStates() {
    return Q.all(['sp', 'rj'].map(function (st) {
        var d = Q.defer();
        d.resolve(st);
        return d.promise;
    }));
}

function getCities(st) {
    if (st === 'sp') {
        return Q.all(['sao_paulo', 'campinas', 'cacapava'].map(function (ct) {
            var d = Q.defer();
            d.resolve(ct);
            return d.promise;
        }));
    } else if (st == 'rj') {
        return Q.all(['macae'].map(function (ct) {
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
.then(function (sts) {
    return Q.all(sts.map(function (st) {
        return getCities(st);
    }));
})
.then(console.log)
.done();