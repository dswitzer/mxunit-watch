var mxunit = require('./mxunit');

var listUrl = 'http://localhost/your/project/tests/list.cfm';

mxunit.loadList(listUrl, function(loaded){
	if (loaded){
		mxunit.runAll(function(){});
	}else{
		console.log('ERROR: Unable to load tests list. Did you enter the correct URL? (' + listUrl + ')');
	}
});
