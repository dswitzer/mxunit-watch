var fix = require('./string-fix');
var request = require('request');
var xcolor = require('xcolor');
var _ = require('underscore');
var async = require('async');

var lineWidth = 80;

var suites = {};

function isEmpty(obj) {
    if (obj == null) return true;
    if (obj.length && obj.length > 0)    return false;
    if (obj.length === 0)  return true;
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key))    return false;
    }
    return true;
}

module.exports = {

	loadList: function(url, callback){
		request(url, function(err, resp, body){
			if (!err && resp.statusCode === 200){
				suites = JSON.parse(body);
			}else{
				suites = {};
			}
			if (callback){
				callback(!isEmpty(suites));
			}
		});
	}

	,runAll: function(hostname, callback){
		function queueSuite(hostname, suiteName){
			return function(cb){
				module.exports.runSuite(hostname, suiteName, function(pass){
					cb(null, pass);
				});
			}
		}

		var queuedSuites = [];
		for (var suite in suites){
			queuedSuites.push( queueSuite(hostname, suite) );
		}

		async.series(queuedSuites, function(err, results){
			var allSuccess = _.reduce(results, function(a, b){ return a && b; }, true);
			console.log('\n' + fix.repeat('=', lineWidth));
			if (allSuccess){
				xcolor.log('{{bg green}}{{white}} ALL SUITES:%s {{/color}}', fix.padl('PASS', lineWidth - 13));
			}else{
				xcolor.log('{{bg red}}{{white}} ALL SUITES:%s {{/color}}', fix.padl('FAIL', lineWidth - 13));
			}
			console.log(fix.repeat('=', lineWidth));
			if (callback) {
				callback(allSuccess);
			}
		});
	}

	,runSuite: function(hostname, suiteName, callback){
		function queueTest(hostname, suiteName, testName){
			return function(cb){
				module.exports.runTest(hostname, suiteName, testName, function(pass){
					cb(null, pass);
				});
			}
		}

		xcolor.log('\n{{blue}}' + suiteName + '{{/color}}\n')
		console.log(fix.repeat('-', lineWidth));
		var tests = suites[suiteName];
		var queuedTests = [];

		for (var test in tests){
			queuedTests.push( queueTest(hostname, suiteName, tests[test]) );
		}

		async.series(queuedTests, function(err, results){
			var allSuccess = _.reduce(results, function(a, b){ return a && b; }, true);
			console.log(fix.repeat('-', lineWidth));
			if (allSuccess){
				xcolor.log('{{bg green}}{{white}} SUITE:%s {{/color}}', fix.padl('PASS', lineWidth - 8));
			}else{
				xcolor.log('{{bg red}}{{white}} SUITE:%s {{/color}}', fix.padl('FAIL', lineWidth - 8));
			}
			callback(_.reduce(results, function(a, b){ return a && b; }, true));
		});
	}

	,runTest: function(hostname, cfc, test, callback){
		var path = 'http://' + hostname + '/' + cfc.split('.').join('/') + '.cfc?method=runTestRemote&output=json&testMethod=' + test;
		request(path, function(err, resp, body){
			if (!err && resp.statusCode === 200){
				body = JSON.parse(body)[0];
				if (body.TESTSTATUS === 'Passed'){
					xcolor.log(fix.padr(test, lineWidth - 9) + ' [{{bg green}}{{white}} PASS {{/color}}]');
					callback(true);
				}else{
					xcolor.log(fix.padr(test, lineWidth - 9) + ' [{{bg red}}{{white}} FAIL {{/color}}]');
					console.log('   =>  ' + body.ERROR.Message);
					console.log('   =>  ' + body.ERROR.Detail);
					callback(false);
				}
			}else{
				xcolor.log(fix.padr(test, lineWidth - 9) + ' [{{bg red}}{{white}} FAIL {{/color}}]');
				console.log('Request failed:', resp);
				callback(false);
			}
		});
	}

};
