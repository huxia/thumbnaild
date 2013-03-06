
var   im = require('imagemagick')
	, localCache = require('./local_cache')
	;



function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
};

function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}
var LOCAL_CACHE_TYPE = 'trash';
localCache.setMaxCacheTime(LOCAL_CACHE_TYPE, -1);
localCache.setMaxCacheCount(LOCAL_CACHE_TYPE, -1);

function runImagemagickProcessors(processors, i, srcData, callback){
	console.info('runImagemagickProcessors: ');
	if (i >= processors.length){
		console.info('runImagemagickProcessors return srcData');
		callback(null, srcData);
		return;
	}
	processor = processors[i];
	console.info(processor);
	var func = im[processor['function']];
	if(typeof func != 'function')
		throw "unsupport function for imagemagick: " + processor['function'];
	var args = processor['arguments'];

	args.srcData = srcData;
	var tmpFileID = guid();
	args.dstPath = localCache.path(LOCAL_CACHE_TYPE, tmpFileID);

	// imagemagick
	func.apply(im, [args, function(err, stdout, stderr){
		if(err){
			localCache.remove(LOCAL_CACHE_TYPE, tmpFileID);
			callback(err);
			console.info(err);
			return;
		}
		localCache.read(LOCAL_CACHE_TYPE, tmpFileID, function(data){
			if(data){
				runImagemagickProcessors(processors, i+1, data, function(err, data){
					callback(err, data);
					localCache.remove(LOCAL_CACHE_TYPE, tmpFileID);
					console.info('runImagemagickProcessors done');
				});
			}else{
				callback('Unknown error', null);
				console.info('runImagemagickProcessors Unknwon error');
				localCache.remove(LOCAL_CACHE_TYPE, tmpFileID);
			}
		});
	}]);
}

exports.processImage = function(processorsArray, srcData, callback){
	runImagemagickProcessors(processorsArray, 0, srcData, callback);
};