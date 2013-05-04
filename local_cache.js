var fs = require('fs')
  , path = require('path')
  ;

var maxCacheTime = {};
var maxCacheCount = {};


var tmpFolder = global.THUMBNAILD_HOME + '/tmp';


var removeFileTimeout = {};


function resetRemoveTimeout(type, id){

	var file = tmpFolder + '/' + type + '/' + id;
	if (maxCacheTime[type] > 0) {
		if(!removeFileTimeout[type]) removeFileTimeout[type] = {};
		clearTimeout(removeFileTimeout[type][id]);
		removeFileTimeout[type][id] = 0;
		delete removeFileTimeout[type][id];
		removeFileTimeout[type][id] = setTimeout(function(){
			fs.unlink(file);
		}, maxCacheTime[type] * 1000);
	}else if(maxCacheTime[type] == 0){
		fs.unlink(file);
	}
}

function removeOnCountExceed(type, depth){
	depth = depth || 0;
	if(depth > 10)
		return false;
	var folder = tmpFolder + '/' + type;
	var files = fs.readdirSync(folder);
	if(!files || maxCacheCount[type] < 0 || files.length < maxCacheCount[type]){
		return false;
	}
	// remove half of the cache
	var countToRemove = files.length / 2;
	if (maxCacheCount[type] == 0)
		countToRemove = files.length; // remove all

	for(var i=0;i<countToRemove;i++){
		fs.unlinkSync(folder + '/' + files[i]);
	}
	removeOnCountExceed(type, depth + 1);
	return true;
}
exports.path = function(type, id){
	var file = tmpFolder + '/' + type + '/' + id;
	if(!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file));
	return file;
};
exports.existsSync = function(type, id){
	var file = tmpFolder + '/' + type + '/' + id;
	return fs.existsSync(file);
};
exports.read = function(type, id, callback) {
	

	var file = tmpFolder + '/' + type + '/' + id;

	console.info('read ' + type + ' ' + id);
	fs.exists(file, function(exists){
		if (!exists){
			console.info('read ' + type + ' ' + id + ': miss');
			callback(null);
			resetRemoveTimeout(type, id);
			return ;
		}
		fs.readFile(file, function(err, data){
			console.info('read ' + type + ' ' + id + ': hit');
			callback(data);
			resetRemoveTimeout(type, id);
		});
	});
};
exports.remove = function(type, id, callback) {
	var file = tmpFolder + '/' + type + '/' + id;
	fs.unlink(file, function(err){
		if(callback) callback(err);
	});
};
exports.write = function(type, id, data, callback) {
	var file = tmpFolder + '/' + type + '/' + id;
	if(!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file));
	resetRemoveTimeout(type, id);
	removeOnCountExceed(type);
	console.info('write ' + type + ' ' + id);
	fs.writeFile(file, data, function(err){
		console.info('write done ' + type + ' ' + id);
		if(callback) callback(err);
	});
};

exports.setMaxCacheTime = function(type, time){
	maxCacheTime[type] = time;
}
exports.setMaxCacheCount = function(type, time){
	maxCacheCount[type] = time;
}
