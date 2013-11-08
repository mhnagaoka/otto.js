

var db = require('../model/db');

var AnpCrawled = require("../model/schemas").AnpCrawled;
var GeoLocalizedAddress = require("../model/schemas").GeoLocalizedAddress;

retrieve({},normalize);

/**
 * Queries AnpCrawled items 
 * @param {argument} query argument.
 * @param {function} callback to return results.
 */
function retrieve(argument,callback){
    
    AnpCrawled.find(argument).sort({station: 1}).exec(function(err,data){
 	if(err){
	    console.log(err);
	    return err;
  	}
 	callback(data);
    });
}


function normalize(data){

	var lastStationName;

	for(var i=0;i<data.length;i++) {
		var doc = data[i];
		if(lastStationName != doc.station.name){
			console.log(doc.station.normalizedAddress);
			console.log(doc.station.address.lat);
			console.log(doc.station.address.lng);
			lastStationName = doc.station.name;

			var geoLocalizedAddress = {
				normalizedAddress: doc.station.normalizedAddress,
				coordinate: []
			}

			geoLocalizedAddress.coordinate.push(doc.station.address.lat);
			geoLocalizedAddress.coordinate.push(doc.station.address.lng);

			GeoLocalizedAddress.create(geoLocalizedAddress, function(err, doc) {
    			var strOutput;
					if (err) {
	 				   console.log(err);
					    strOutput = 'Error creating quotation';
					} else {
					    console.log('Address created: ' + doc.normalizedAddress + ' @ ' + doc.coordinate[0] + ' , ' + doc.coordinate[1]);
					}
    		});
		}
		

	}
	

}

