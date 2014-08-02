var SHARED = {};

exports.set = function(obj, key1, key2){
	if(key2) {
		if(!SHARED[key1]) {
			SHARED[key1] = {}
		}
		SHARED[key1][key2] = obj;
	} else {
		SHARED[key1] = obj;
	}
};

exports.get = function(key1, key2) {
	if(key2) {
		if(!SHARED[key1]) return null;
		else return SHARED[key1][key2];
	} else {
		return SHARED[key1];
	}
};