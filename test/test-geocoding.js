
var SearchAddress =  require('../services/google-get-coordinates').SearchAddress;

var searchAddress = new SearchAddress();


searchAddress.search('Rua Estados Unidos, 1930, Sao Paulo, Sao Paulo',function(data){
    
    for (i = 0; i < data.results.length; i++) {
    	var result = data.results[i];
	console.log(result.geometry.location.lat);
	console.log(result.geometry.location.lng);

    }    
    
});


