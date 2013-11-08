var mongoose = require( 'mongoose' );


/**
* Represents information retrieved from ANP web site
*
**/
var anpCrawledSchema = new mongoose.Schema({
   week: String,
   city: String,
   fuel: String,
   station:{
      address:{
         city: {
            code: String,
            name: String,
            state:{
              code: String,
              name: String
            }
         },
         street: String,
         neighborhood: String,
	 lat: Number,
	 lng: Number
      },
      name: String,
      normalizedAddress: String,
      brand: String,
      sellingPrice: String,
      cost: String,
      purchaseMode: String,
      supplier: String,
      date: String
   }
},{ collection: 'anpcrawled' });

var AnpCrawled = module.exports = mongoose.model('AnpCrawled', anpCrawledSchema);

/**
* Represents fuel information
*
**/
var fuelSchema = new mongoose.Schema({
    fuel:  String,
    brand: String,
    sellingPrice: String,
    cost: String,
    purchaseMode: String,
    supplier: String,
    date: String
});

var Fuel = module.exports = mongoose.model('Fuel', fuelSchema);

/**
* Represents address with geolocalization information
*
**/
var geoLocalizedAddress = new mongoose.Schema({
    normalizedAddress: String,
    coordinate : [Number]
},{ collection: 'geolocalizedAddress'});

var GeoLocalizedAddress = module.exports = mongoose.model('GeoLocalizedAddress', geoLocalizedAddress);


/**
* Represents quotation information, an AnpCrawled normalized.
*
**/
var quotationSchema = new mongoose.Schema({
    week: String,
    city: String,
    state: String,
    localization : [Number],
    station: {
      name: String,
      normalizedAddress: String,
    },
    fuel : [{
      fuel:  String,
      brand: String,
      sellingPrice: String,
      cost: String,
      purchaseMode: String,
      supplier: String,
      date: String
  }]
},{ collection : 'quotation' });


var Quotation = module.exports = mongoose.model('Quotation', quotationSchema);

module.exports = {
  AnpCrawled: AnpCrawled,
  Fuel: Fuel,
  Quotation: Quotation,
  GeoLocalizedAddress: GeoLocalizedAddress
}
