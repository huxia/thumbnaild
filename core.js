
var   fs = require('fs')
	, path = require('path')
	, localCache = require('./local_cache')
	, storage = require('./storage')
	, crypto = require('crypto')
	, imageProcessor = require('./image_processor')
	;
function md5(str){
	var md5 = crypto.createHash('md5');
	md5.update(str, 'utf8');
	return md5.digest('hex');
}

function mkdir(dir){
	if(fs.existsSync(dir)) return;
	exports.mkdir(path.dirname(dir));
	fs.mkdirSync(dir);
}

function loadSchema(schema){
	var p = __dirname + '/config/schemas/' + schema + '.json';
	if (!fs.existsSync(p)){
		return null;
	}
	var result = require(p);
	result.id = schema;
	result.isRaw = function(){
		return this['parent'] == null && (!this['processors'] || this['processors'].length == 0);
	};
	return result;
}
function loadBucket(bucket){
	var p = __dirname + '/config/buckets/' + bucket + '.json';
	if (!fs.existsSync(p)){
		return null;
	}
	var result = require(p);
	result.id = bucket;
	return result;
}

function localStorageID(objectInfo){
	return md5(objectInfo.bucket + '/' + objectInfo.path);
}

function _cache(read, bucket, schema, path, newData, callback){
	var localCacheType = bucket.id + '-' + schema.id;

	if (bucket['cache_locally'] && schema['local_cache']){
		localCache.setMaxCacheTime(localCacheType, schema['local_cache']['max_cache_time']);
		localCache.setMaxCacheCount(localCacheType, schema['local_cache']['max_cache_count']);
	}else{
		localCache.setMaxCacheTime(localCacheType, -1);
		localCache.setMaxCacheCount(localCacheType, -1);
	}

	var localCacheID = md5(path);
	if(read){
		localCache.read(localCacheType, localCacheID, function(data){
			if (data){
				if(callback) callback(data);
				return;
			}
			if (bucket['cache_remotely'] && schema['remote_cache']){
				var s = storage(bucket);
				if(s){
					var remoteCachePath = s.cachePath(schema.id, path);
					s.read(remoteCachePath, function(err, data){
						if(callback) callback(data);
					});
					return;
				}
			}
			if(callback) callback(null);
			
		});
	}else{

		if (bucket['cache_locally'] && schema['local_cache']){
			if (!localCache.existsSync(localCacheType, localCacheID)){
				localCache.write(localCacheType, localCacheID, newData);
			}
		}
		if (bucket['cache_remotely'] && schema['remote_cache']){
			var s = storage(bucket);
			if (s) {
				var remoteCachePath = s.cachePath(schema.id, path);
				s.write(remoteCachePath, newData);
			}
		}
	}
}

function readCache(bucket, schema, path, callback){
	_cache(true, bucket, schema, path, null, callback);
}
function writeCache(bucket, schema, path, newData){
	console.info('writeCache ' + schema.id + ' ' + path );
	_cache(false, bucket, schema, path, newData, null);
}
exports.requestThumbnail = function(objectInfo, callback){
	var bucket = objectInfo._bucket ? objectInfo._bucket : loadBucket(objectInfo.bucket);
	if (!bucket)
		callback({status: 500, message: 'Bucket not found: ' + objectInfo.bucket}, null);
	var schema = loadSchema(objectInfo.schema);
	if (!schema)
		callback({status: 404, message: 'Schema not found: ' + objectInfo.schema}, null);
	
	readCache(bucket, schema, objectInfo.path, function(cachedData){
		if (cachedData){
			callback(null, cachedData);
			return;
		}
		if(schema.isRaw()){
			var s = storage(bucket);
			if(!s){
				callback({status: 500, message: 'Storage not found: ' + bucket['storage']}, null);
				return;
			}
			s.read(objectInfo.path, function(err, data){
				console.info('here');
				if(err || !data){
					callback({status: 404, message: err || ('Not found: ' + objectInfo.path)}, null);
					return;
				}

				writeCache(bucket, schema, objectInfo.path, data);
				callback(null, data);
			});
		}else if(schema['parent']){
			exports.requestThumbnail({
				bucket: objectInfo.bucket,
				_bucket: bucket,
				schema: schema['parent'],
				path: objectInfo.path
			}, function(error, data){
				if(error || !data){
					callback(error ? error : {status: 404, message: 'Not found: ' + objectInfo.path + '[' + schema['parent'] + ']'}, null);
					return;
				}
				imageProcessor.processImage(schema['processors'], data, function(error, data){
					if (error || !data){
						callback({status: 500, message: 'Image process error: ' + schema['parent'] + ' => ' + schema['id']}, null);
						return;
					}
					writeCache(bucket, schema, objectInfo.path, data);
					callback(null, data);
				});
			});
		}else{
			callback({status: 500, message: 'Schema parent not found: ' + objectInfo.schema}, null);
		}
	});
}