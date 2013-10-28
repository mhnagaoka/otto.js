var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;

FuelQuotationProvider = function(host, port) {
  this.db= new Db('otto', new Server(host, port, {safe: false}, {auto_reconnect: true}, {}));
  this.db.open(function(){});
};


FuelQuotationProvider.prototype.getCollection= function(callback) {
  this.db.collection('quotation', function(error, quotation_collection) {
    if( error ) callback(error);
    else callback(null, quotation_collection);
  });
};

//find all price detailed
FuelQuotationProvider.prototype.findAll = function(callback) {
    this.getCollection(function(error, quotation_collection) {
      if( error ) callback(error)
      else {
        price_collection.find().toArray(function(error, results) {
          if( error ) callback(error)
          else callback(null, results)
        });
      }
    });
};

//save new fuel price detailed
FuelQuotationProvider.prototype.save = function(quotations, callback) {
    this.getCollection(function(error, quotation_collection) {
      if( error ) callback(error)
      else {
        if( typeof(quotations.length)=="undefined")
          quotations = [quotations];

        for( var i =0;i< quotations.length;i++ ) {
          quotation = quotations[i];
          quotation.created_at = new Date();
        }

        quotation_collection.insert(quotations, function() {
          callback(null, quotations);
        });
      }
    });
};

exports.FuelQuotationProvider = FuelQuotationProvider;
