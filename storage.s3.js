module.exports = function(bucketInfo){
	var aws = require('aws-sdk');
	aws.config.update({
		"region": 'us-east-1'
	});
	aws.config.update(bucketInfo['storage_config']);
	var s3 = new aws.S3();
	this.read = function(path, callback){
		s3.client.getObject({
			Bucket: bucketInfo['storage_config']['bucket'],
			Key: path
		}).on('complete', function(response){
			var error = null;
			if (!response || response.error || !response.data){
				error = response.error && response.error.message || 'unknwon s3 error';
			}
			console.info('s3 read done. error: ' + error);
			if (callback) {
				callback(error, response && response.data && response.data.Body);
			}
		}).send();
	};
	this.write = function(path, data, callback){
		s3.client.putObject({
			Bucket: bucketInfo['storage_config']['bucket'],
			Key: path,
			Body: data
		}).on('complete', function(response){

			var error = null;
			if (!response || response.error || !response.data){
				error = response.error && response.error.message || 'unknwon s3 error';
			}
			console.log('s3 write done: error: ' + error);
			if (callback) {
				callback(error);
			}
		}).send();
	};
	return this;
}