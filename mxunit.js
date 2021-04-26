var fix = require('./string-fix');
var request = require('request');
var xcolor = require('xcolor');
var _ = require('underscore');
var async = require('async');
var utils = require('./utils');
var TestResult = require('./TestResult');
var TestSuiteResult = require('./TestSuiteResult');

var lineWidth = 80;
var httpTimeout = 120000; // in milliseconds
var batchMode = false;

var suites = {}
	, suiteCount = 0
;

function isEmpty(obj) {
    if (obj == null) return true;
    if (obj.length && obj.length > 0)    return false;
    if (obj.length === 0)  return true;
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key))    return false;
    }
    return true;
}

function log(str, callback) {
	var args = arguments;

	if( typeof callback == "function" ){
		args = callback(fix, lineWidth);
		// for simple strings, return as a single array item
		if( typeof args == "string" ){
			args = [args];
		// if we do not have an array, ignore the output
		} else if( !Array.isArray(args) ) {
			args = [];
		}

		// prepend the string to the beginning of the string
		args.unshift(str);
	}

  xcolor.log.apply(this, args);
}

function writeSuiteName(suiteName, desc){
	let description = (typeof desc === "string") ? ' ' + desc + ' '  : '';
	log('\n\n{{blue}}%s{{/color}}{{white}}%s{{/color}}', fix.padr(suiteName, lineWidth-description.length), description);
	console.log(fix.repeat('-', lineWidth));
}

function writeSuiteResultStatus(suiteResult, executionTime){
	console.log(fix.repeat('-', lineWidth));
	let msg = "SUITE [in " + utils.timeConversion(executionTime) + "]:";

	if( suiteResult.hasSuccess() ){
		log('{{bg green}}{{white}} %s%s {{/color}}', msg, fix.padl('PASS: ' + suiteResult.totalPassed(), lineWidth - msg.length - 2));
	} else {
		let totalFailed = suiteResult.totalFailed()
			, totalFailedMsg = totalFailed ? `: ${totalFailed}` : '';
		;
		log('{{bg red}}{{white}} %s%s {{/color}}', msg, fix.padl('FAIL' + totalFailedMsg, lineWidth - msg.length - 2));
	}
}

function processTestResult(test, results, executionTime){
	/*
	 * When the unit test returns an execution time, we will show that number instead because it reflect the actual
	 * time of the test w/out the HTTP overhead.
	 */
	if( ("TIME" in results) && Number.isInteger(parseInt(results.TIME)) ){
		executionTime = parseInt(results.TIME);
	}

	let executionMsg = "[" + utils.timeConversion(executionTime) + "] ";
	let paddingOffset = lineWidth - 9 - executionMsg.length;

	if (results.TESTSTATUS === 'Passed'){
		log(fix.padr(test, paddingOffset) + ' %s[{{bg green}}{{white}} PASS {{/color}}]', executionMsg);
		return new TestResult(test, true);
	} else {
		let errorMessage;
		log(fix.padr(test, paddingOffset) + ' %s[{{bg red}}{{white}} FAIL {{/color}}]', executionMsg);

		//console.log("Test Results -> %o", results);

		if( results.hasOwnProperty("ERROR") ){
			errorMessage = (results.ERROR.Message || "").toString().trim() || "An unknown error occurred!";
			if( errorMessage.length ){
				log('{{red}}   =>  %s{{/color}}', errorMessage);
			}
			if( (results.ERROR.Detail || "").toString().trim().length ){
				log('{{red}}   =>  %s{{/color}}', results.ERROR.Detail);
			}
		}
		return new TestResult(test, false, errorMessage);
	}
}

function getHttpError(err, resp, httpTimeout){
	let statusCode = "";
	let errorMessage = "";

	if( err.code === 'ETIMEDOUT' ){
		statusCode = "TIMEDOUT";

		if( err.connect === true ){
			errorMessage = "The remote connection to the server has timed out.";
		} else {
			errorMessage = `The HTTP request was not completed before the ${httpTimeout} connection timeout period.`;
		}

	} else {
		statusCode = resp.statusCode;
		if( resp.statusMessage && resp.statusMessage.length ){
			errorMessage = resp.statusMessage;
		} else {
			errorMessage = "This test suite could not be run due to an error trying to with th HTTP request. Please check the above URL for any errors.";
		}
	}

	return {
		  statusCode: statusCode
		, errorMessage: errorMessage
	};
}

module.exports = {

	loadList: function(url, callback){
		if( batchMode ){
			url += (url.indexOf("?" === -1) ? "?" : "&") + "batch=true";
		}

		request({url: url, timeout: httpTimeout}, function(err, resp, body){
			if (!err && resp.statusCode === 200){
				suites = JSON.parse(body);
				suiteCount = Object.keys(suites).length;
			}else{
				suites = {};
				suiteCount = 0;
			}
			if (callback){
				callback(!isEmpty(suites));
			}
		});
	}

	, log: log

	, getLineWidth: function (){
		return lineWidth;
	}

	, setLineWidth: function (width){
		if( !Number.isInteger(width) ){
			throw "Line width must be an integer!";
		}

		lineWidth = width;
	}

	, getHttpTimeout: function (){
		return httpTimeout/1000;
	}

	, setHttpTimeout: function (timeout){
		if( !Number.isInteger(timeout) ){
			throw "The HTTP timeout must be an integer!";
		}

		httpTimeout = timeout * 1000;
	}

	, getBatchMode: function (){
		return batchMode;
	}

	, setBatchMode: function (status){
		batchMode = !!status;
	}

	, runAll: function(hostname, callback){
		let startTime = utils.getEpochMilliseconds();

		function queueSuite(hostname, suiteName, idx){
			let suiteNameDesc = "(" + idx + " of " + suiteCount + ")";
			return function(cb){
				module.exports[batchMode ? "runSuiteFull" : "runSuite"](hostname, suiteName, function(results){
					cb(null, results);
				}, suiteNameDesc);
			}
		}

		var queuedSuites = []
			, idx = 0
		;
		for( var suite in suites ){
			queuedSuites.push( queueSuite(hostname, suite, ++idx) );
		}

		async.series(queuedSuites, function(err, results){
			let allSuccess = !results.some((TestSuiteResult) => !TestSuiteResult.hasSuccess());
			let totalPassed = results.reduce((total, suite) => total + suite.totalPassed(), 0)
				, totalFailed = results.reduce((total, suite) => total + suite.totalFailed(), 0)
				, totalPassFailMsg = `PASS: ${totalPassed} / FAIL: ${totalFailed}` 
			;

			console.log('\n');
			if( allSuccess ){
				log('{{bg green}}' + fix.repeat(' ', lineWidth) + '{{/color}}');
				log('{{bg green}}{{white}} ALL SUITES:%s {{/color}}', fix.padl(totalPassFailMsg, lineWidth - 13));
				log('{{bg green}}' + fix.repeat(' ', lineWidth) + '{{/color}}');
			} else {
				log('{{bg red}}' + fix.repeat(' ', lineWidth) + '{{/color}}');
				log('{{bg red}}{{white}} ALL SUITES:%s {{/color}}', fix.padl(totalPassFailMsg, lineWidth - 13));
				log('{{bg red}}' + fix.repeat(' ', lineWidth) + '{{/color}}');
				log("\n{{red}}The following summary contains a list of all errors found when running the unit tests:{{/color}}\n");
				results.forEach(function (suiteResults, idx, results){
					
					if( !suiteResults.hasSuccess() ){
						// output the suite's name
						log('{{red}}%s{{/color}}', suiteResults.name);

						if( !!suiteResults.message ){
							log('{{red}}=>  %s{{/color}}', suiteResults.message);
						}

						let errors = suiteResults.errors();

						errors.forEach(function (testResult, idx, errors){
							log('{{red}} • %s{{/color}}', testResult.name);
							log('{{red}}   =>  %s{{/color}}', testResult.message);
						});

					}
				})
			}
			let totalMs = utils.getEpochMilliseconds() - startTime;
			log('\n\n{{bg yellow}}{{black}} TOTAL EXECUTION TIME:%s {{/color}}', fix.padl(utils.timeConversion(totalMs), lineWidth - 23));
			if( callback ){
				callback(allSuccess);
			}
		});
	}

	, runSuiteFull: function(hostname, suiteName, callback, desc){
		let startTime = utils.getEpochMilliseconds();
		var path = 'http://' + hostname + '/' + suiteName.split('.').join('/') + '.cfc?method=runTestRemote&output=json';

		writeSuiteName(suiteName, desc);

		const updateLine = (msg) => process.stdout.write("\r" + (msg||""));
		const workingUpdate = () => updateLine("Running test suite... " + utils.timerFormat(utils.getEpochMilliseconds() - startTime));

		// start updating the screen with the runtime
		const workingUpdateJob = setInterval(workingUpdate, 1000);
		let workingJobFinished = function (){
			clearInterval(workingUpdateJob);
			updateLine(); // reset the line
		};

		request({url: path, timeout: httpTimeout}, function(err, resp, body){
			workingJobFinished();

			// the entire suite ran
			if( !err && (resp.statusCode === 200) ){
				try {
					var results = JSON.parse(body);
					var hasParsedBody = true;
				} catch (e){
					var suiteResults = new TestSuiteResult(suiteName, false, "Error processing JSON response!");
					console.log("HTTP Response -> %o", body);
					hasParsedBody = false;
				}

				if( hasParsedBody ){
					var suiteResults = new TestSuiteResult(suiteName, true)
	
					results
						// sort the results so they come back in order
						.sort((a, b) => (a.TESTNAME||"").localeCompare((b.TESTNAME||"")))
						.forEach((test, idx, results) => {
							suiteResults.add(processTestResult(test.TESTNAME, test));
						})
					;
				}

				writeSuiteResultStatus(suiteResults, (utils.getEpochMilliseconds() - startTime));

				callback(suiteResults);
			} else {
				workingJobFinished();
				let httpError = getHttpError(err, resp, httpTimeout);

				log("\n\n{{red}}[%s] %s{{/color}}\n", httpError.statusCode, path);
				log("%s\n", httpError.errorMessage);

				let suiteResults = new TestSuiteResult(suiteName, false, httpError.errorMessage);

				writeSuiteResultStatus(suiteResults, (utils.getEpochMilliseconds() - startTime));

				callback(suiteResults);
			}

		});
	}

	, runSuite: function(hostname, suiteName, callback, desc){
		let startTime = utils.getEpochMilliseconds();
		let suiteResults = new TestSuiteResult(suiteName, true)

		function queueTest(hostname, suiteName, testName){
			return function(cb){
				module.exports.runTest(hostname, suiteName, testName, function(results){
					suiteResults.add(results);
					if( !results.hasSuccess() ){
						suiteResults.success = false;
					}
					cb(null, results);
				});
			}
		}

		writeSuiteName(suiteName, desc);

		var tests = suites[suiteName];
		var queuedTests = [];

		for (var test in tests){
			queuedTests.push( queueTest(hostname, suiteName, tests[test]) );
		}

		async.series(queuedTests, function(err, results){
			writeSuiteResultStatus(suiteResults, (utils.getEpochMilliseconds() - startTime));
			callback(suiteResults);
		});
	}

	, runTest: function(hostname, cfc, test, callback){
		let startTime = utils.getEpochMilliseconds();
		var path = 'http://' + hostname + '/' + cfc.split('.').join('/') + '.cfc?method=runTestRemote&output=json&testMethod=' + test;

		request({url: path, timeout: httpTimeout}, function(err, resp, body){
			let httpExecution = utils.getEpochMilliseconds() - startTime;
			if (!err && resp.statusCode === 200){
				callback(processTestResult(test, JSON.parse(body)[0], httpExecution));
			} else {
				let httpError = getHttpError(err, resp, httpTimeout);
				callback(processTestResult(test, {TESTSTATUS: "Failed", ERROR: {Message: httpError.errorMessage}}, httpExecution));
			}
		});
	}

};
