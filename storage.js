var fs = require('fs');

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
			return 'thumbnaild/cache/' + schema + '/' + originPath;
		}
	}
	return result;
}