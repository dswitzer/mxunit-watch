
function reverse(s){
	return s.split('').reverse().join('');
}

module.exports = {

	padr: function(input, len){
		padder = this.repeat(' ', len);
		return reverse((padder + reverse(input)).slice(-1 * len));
	}

	,padl: function(input, len){
		padder = this.repeat(' ', len);
		return (padder + input).slice(-1 * len);
	}

	,repeat: function(s, times){
		var padder = [];
		for (var i = 0; i<times; i++){
			padder.push(s);
		}
		return padder.join('');
	}

};
