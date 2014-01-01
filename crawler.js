var request = require('request');
var Q = require('q');

function crawl(strategy) {
    Q.denodeify(request, strategy.opts)()
        .done(strategy.parser);
}

exports.crawl = crawl;
