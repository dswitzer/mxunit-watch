module.exports = class TestSuiteResult {
	constructor(name, success, message) {
		this.name = name;
		this.success = success;
		this.message = message || null;
		this.results = [];
	}

	add(input){
		// when an array is passed, add all the results
		if( Array.isArray(input) ){
			this.results = this.results.concat(input);
		// otherwise, we just append the current test
		} else {
			this.results.push(input);
		}
	}

	hasSuccess(){
		var testSuiteSuccess = (typeof this.success == "undefined") ? false : Boolean(this.success);

		// we should return false when either the suite has failed or any of the tests have failed
		return testSuiteSuccess && !this.results.some((TestResult) => !TestResult.hasSuccess())
	}

	errors(){
		return this.results
			.filter((TestResult) => !TestResult.hasSuccess())
		;
	}

	count(){
		return this.results.length;
	}

	totalPassed(){
		return this.results.reduce((total, TestResult) => total + (TestResult.hasSuccess() ? 1 : 0 ), 0);
	}

	totalFailed(){
		// if we have a failure, but no tests this means we could not load the suite so must show at least 1 error
		if( !this.success && (this.results.length === 0) ){
			return 1;
		}
		return this.results.reduce((total, TestResult) => total + (TestResult.hasSuccess() ? 0 : 1 ), 0);
	}
}
