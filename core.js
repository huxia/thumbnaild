
var   fs = require('fs')
	, path = require('path')
	, localCache = require('./local_cache')
	, storage = require('./storage')
	, crypto = require('crypto')
	, imageProcessor = require('./image_processor')
	, async = require('async')
	, util = require('util')
	, deepExtend = require('deep-extend')
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
	var p = global.THUMBNAILD_HOME + '/config/schemas/' + schema + '.json';
	if (!fs.existsSync(p)){
		return null;
	}
	var result = require(p);
	if (!result.id) result.id = schema;
	result.isRaw = function(){
		return this['parent'] == null && (!this['processors'] || this['processors'].length == 0);
	};
	return result;
}
var DYNAMIC_BUCKET_SPLITER = ':';
function encodeBucket(bucketId, additionalBucketInfo, key){
	if (!additionalBucketInfo){
		return bucketId;
	}
	var cipher = crypto.createCipher('aes-256-cbc',key);
	var crypted = cipher.update(JSON.stringify(additionalBucketInfo),'utf8','hex');
	crypted += cipher.final('hex');

	return bucketId + DYNAMIC_BUCKET_SPLITER + crypted;
}
exports.encodeBucket = encodeBucket;
function loadBucket(bucketId){
	var additionalBucketInfoStr = null;
	if (bucketId && (bucketId.indexOf(DYNAMIC_BUCKET_SPLITER) > -1)){
		additionalBucketInfoStr = bucketId.substr(bucketId.indexOf(DYNAMIC_BUCKET_SPLITER) + 1);
		bucketId = bucketId.substr(0, bucketId.indexOf(DYNAMIC_BUCKET_SPLITER));
	}

	var p = global.THUMBNAILD_HOME + '/config/buckets/' + bucketId + '.json';
	if (!fs.existsSync(p)){
		return null;
	}
	var result = require(p);
	if (additionalBucketInfoStr && additionalBucketInfoStr.length){
		var decipher = crypto.createDecipher('aes-256-cbc', result['shared_secret']);
		var dec = decipher.update(additionalBucketInfoStr,'hex','utf8');
		dec += decipher.final('utf8');

		result = deepExtend(result, JSON.parse(dec));
		result.id = bucketId + '~' + md5(additionalBucketInfoStr);
	}
	if (!result.id) result.id = bucketId;
	return result;
}

exports.loadBucket = loadBucket;
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
			localCache.write(localCacheType, localCacheID, newData);
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
	_cache(false, bucket, schema, path, newData, null);
}

var SIGNING_BASESTRING_FILE_MD5_FORMAT = "__file_%s_md5=%s";
var SIGNING_PARAM_NAME = 'sign';
exports.SIGNING_BASESTRING_FILE_MD5_FORMAT = SIGNING_BASESTRING_FILE_MD5_FORMAT;
exports.SIGNING_PARAM_NAME = SIGNING_PARAM_NAME;

exports.verifyHttpRequestSigning = function(request, secret, callback){
	if (!secret || !secret.length){
		callback(true);
		return;
	}
	var exp = new RegExp('([\?\&])' + SIGNING_PARAM_NAME + '=([^\&]*)(\&|$)');
	var match = request.url.match(exp);
	var requestSign = match && match[2] || null;
	if (!requestSign || !requestSign.length){
		callback(false);
		return;
	}
	exports.getRequestSigning({
		url: request.url.replace(exp, '$1$3'), // get rid of sign=xxx
		files: request.files,
		body: request.body,
		method: request.method
	}, secret, function(err, sign){
		if(err){
			callback(false);
			return;
		}
		callback(sign == requestSign);
	});
}
exports.getRequestSigningBaseStringSync = function(request){
	return exports.getRequestSigningBaseString(request, "sync");
};

exports.getRequestSigningBaseString = function(request, callback){
	if (typeof request == 'string')
		request = {url: request};
	// get rid of schema and host
	request.url = request.url.replace(/^[\w\-]+\:\/+[^\/]+/, '');
	var urlMatch = request.url.match(/^([^\?]*)(\?)?(.*)?$/);
	var queryParts = (urlMatch[3] || '').split('&');
	var queries = [];
	for (var i = 0; i < queryParts.length; i++) {
		var kvMatch = queryParts[i].match(/([^=]*)(=)?(.*)?/);
		if (kvMatch[1] && kvMatch[1].length){
			var k = kvMatch[1] || "";
			var v = kvMatch[3] || "";
			queries.push(k + '=' + v);
		}
	}

	var posts = [];

	if (request.body){
		if (typeof request.body == 'string'){
			var bodyParts = request.body.split('&');
			for (var i = 0; i < bodyParts.length; i++) {
				var kvMatch = bodyParts[i].match(/([^=]*)(=)?(.*)?/);
				if (kvMatch[1] && kvMatch[1].length){
					var k = kvMatch[1] || "";
					var v = kvMatch[3] || "";
					posts.push(k + '=' + v);
				}
			}
		}else{
			for (var i in request.body) {
				posts.push(encodeURIComponent(i) + '=' + encodeURIComponent(request.body[i]));
			}
		}
	}


	var doCallback = function(method, uri, queries, posts, files){
		for(var i in files)
			posts.push(files[i]);
		
		var baseString = [method || 'GET', ' ', uri, '?', queries.sort().join('&'), "\n", posts.sort().join('&')].join('');
		if (typeof callback == 'function'){
			callback(null, baseString);
		}
		return baseString;
	};

	if (!request.files){
		return doCallback(request.method, urlMatch[1], queries, posts, []);
	}else {
		var funcsForCalMd5 = []
		for (var i in request.files) {
			var file = request.files[i];
			if (typeof file == 'string'){
				funcsForCalMd5.push(function(cb){
					var shasum = crypto.createHash('md5');
					var s = fs.ReadStream(file);
					s.on('data', function(d) { shasum.update(d); });
					s.on('end', function() {
					    var md5 = shasum.digest('hex');
						cb(null, util.format(SIGNING_BASESTRING_FILE_MD5_FORMAT, encodeURIComponent(i), encodeURIComponent(md5)));				    
					});
				});
			}else if (file.path && typeof callback == 'function'){
				funcsForCalMd5.push(function(cb){
					var shasum = crypto.createHash('md5');
					var s = fs.ReadStream(file.path);
					s.on('data', function(d) { shasum.update(d); });
					s.on('end', function() {
					    var md5 = shasum.digest('hex');
						cb(null, util.format(SIGNING_BASESTRING_FILE_MD5_FORMAT, encodeURIComponent(i), encodeURIComponent(md5)));				    
					});
				});
			}else if(typeof Stream != 'undefined' && file instanceof Stream && typeof callback == 'function'){
				funcsForCalMd5.push(function(cb){
					var shasum = crypto.createHash('md5');
					file.on('data', function(d) { shasum.update(d); });
					file.on('end', function() {
					    var md5 = shasum.digest('hex');
						cb(null, util.format(SIGNING_BASESTRING_FILE_MD5_FORMAT, encodeURIComponent(i), encodeURIComponent(md5)));				    
					});
				});
			}else if(file instanceof Buffer){
				funcsForCalMd5.push(function(cb){
					var md5 = crypto.createHash('md5').update(file).digest("hex");
					cb(null, util.format(SIGNING_BASESTRING_FILE_MD5_FORMAT, encodeURIComponent(i), encodeURIComponent(md5)));
				});
			}else{
				if (typeof callback == 'function')
					callback('Illegal file', null);
				return null;
			}
		}
		var _syncResult = null;
		async.parallel(funcsForCalMd5, function(error, results){
			if(error){
				callback(error, null);
				return;
			}

			_syncResult = doCallback(request.method, urlMatch[1], queries, posts, results);
		})
		return _syncResult;
	}
}

exports.getRequestSigning = function(request, secret, callback){
	exports.getRequestSigningBaseString(request, function(err, baseString){
		if(err){
			callback(err, null);
			return;
		}

		callback(null, secret && secret.length ? crypto.createHmac('sha1', secret).update(baseString).digest('hex') : null);
	});
}

exports.getRequestSigningSync = function(request, secret){
	if (!secret || !secret.length)
		return null;
	var baseString = exports.getRequestSigningBaseStringSync(request);
	return crypto.createHmac('sha1', secret).update(baseString).digest('hex');
}
// generateThumbanilAndSaveToRemote(rawData, schema, bucket, callback)
// generateThumbnail(rawData, schema, callback)
exports.generateThumbnail = function(rawData, schema, callback){
	if(!schema)
		callback('schema is null', null);
	if(schema.isRaw()){
		callback(null, rawData);
	}else if(schema['parent']){
		exports.generateThumbnail(rawData, localSchema(schema['parent']), function(error, data){
			if(error || !data){
				callback(error ? error : 'unknown error', null);
				return;
			}
			imageProcessor.processImage(schema['processors'], data, function(error, data){
				if (error || !data){
					callback('Image process error: ' + schema['parent'] + ' => ' + schema['id'], null);
					return;
				}
				writeCache(bucket, schema, objectInfo.path, data);
				callback(null, data);
			});
		});
	}else{
		callback("schema's parent not found" + schema.id, null);
	}
}
// scanAndGenerateThumbnailForRemote(bucket, from, callback)
exports.requestThumbnaild = function(objectInfo, callback){
	var bucket = objectInfo._bucket ? objectInfo._bucket : loadBucket(objectInfo.bucket);
	if (!bucket){
		callback({status: 500, message: 'Bucket not found: ' + objectInfo.bucket}, null);
		return;
	}
	var schema = loadSchema(objectInfo.schema);
	if (!schema){
		callback({status: 404, message: 'Schema not found: ' + objectInfo.schema}, null);
		return;
	}
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
			exports.requestThumbnaild({
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