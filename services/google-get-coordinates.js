var Client = require('node-rest-client').Client;

var url = "http://maps.google.com/maps/api/geocode/json"

var client = new Client();



SearchAddress = function(){
    // registering remote methods
    client.registerMethod("jsonMethod", url, "GET");
    
}

SearchAddress.prototype.search = function(address,callback){

    var args ={
	   parameters:{address: address ,sensor:'false'}
    };
    
    client.methods.jsonMethod(args, function(data,response){

        var obj = JSON.parse(data);

        callback(obj);

    });

}

exports.SearchAddress = SearchAddress;




