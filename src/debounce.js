this.exports = function(time, orgFn, thisarg) {
	var timeout, args;
	return function() {
		args = Array.prototype.slice.call(arguments);
		if(!timeout) {
			orgFn.apply(thisarg, args);
			args = null;
			timeout = setTimeout(function(){
				if(args) {
					orgFn.apply(thisarg, args);
				}
			}, time);
		}
	};
};