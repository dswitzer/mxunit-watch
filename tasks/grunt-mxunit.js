var mxunit = require('../mxunit');

module.exports = function(grunt) {

	grunt.registerTask('mxunit', 'run mxunit.', function() {

		var done = this.async();

		var options = this.options({
			debug: false,
			list: "http://localhost/test-list.cfm",
			host: "localhost"
		});

		mxunit.loadList(options.list, function(loaded){
			if (loaded) {
				mxunit.runAll(options.host, function(){
					done();
				});
			} else {
				console.log('ERROR: Unable to load tests list. Did you enter the correct URL? (' + options.list + ')');
				done();
			}
		});

	});

};
