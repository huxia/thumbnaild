var fs = require('fs');
var CACHE_PREFIX = 'thumbnaild/cache/';
module.exports = function(bucketInfo){


	var storagesPath = __dirname + '/storage.' + bucketInfo.storage + '.js';
	console.info(storagesPath);
	if (!fs.existsSync(storagesPath)){
		return null;
	}
	var storage = require(storagesPath);
	var result = new storage(bucketInfo);
	if (!result.cachePath){
		result.cachePath = function(schema, originPath){
			if (originPath && 
				originPath.length > CACHE_PREFIX.length && 
				originPath.substr(0, CACHE_PREFIX.length) == CACHE_PREFIX){
				return null;
			}	
			return CACHE_PREFIX + schema + '/' + originPath;
		}
	}
	return result;
}