module.exports = class TestResult {
	constructor(name, success, message) {
		this.name = name;
		this.success = success;
		this.message = message || null;
	}

	hasSuccess(){
		return (typeof this.success == "undefined") ? false : Boolean(this.success);
	}
}
