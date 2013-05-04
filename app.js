#!/usr/bin/env node
var express = require('express')
	, fs = require('fs')
	, path = require('path')
	, moment = require('moment')
	, core = require('./core')
	, argv = require('optimist').argv
	, deepExtend = require('deep-extend')
	;

var settings = deepExtend({
	port: 8011
}, argv);

var app = module.exports = express();

// Configuration

app.configure(function(){
	app.set('views', __dirname);
	app.set('view engine', 'ejs');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
});

// signing
function verifySigning(req, res, next){
	var bucket = core.loadBucket(req.params.bucket_id);
	if (!bucket){
		res.statusCode = 404;
		res.write('Bucket id not found');
		res.end();
		return;
	}
	if (!bucket['shared_secret'] || !bucket['shared_secret'].length){
		next();
		return;
	}
	core.verifyHttpRequestSigning(req, bucket['shared_secret'], function(ok){
		if (!ok){
			if(app.settings.env == 'development'){
				var exp = new RegExp('([\?\&])' + core.SIGNING_PARAM_NAME + '=([^\&]*)(\&|$)');
				var request = {
					url: req.url.replace(exp, '$1$3'),
					method: req.method,
					body: req.body,
					files: req.files
				};
				core.getRequestSigningBaseString(request, function(err, baseStr){
					core.getRequestSigning(request, bucket['shared_secret'], function(err, sign){
						res.statusCode = 401;
						res.set('Content-Type', 'text/html');
						res.write('<h1>Signing error</h1>');
						res.write('<h2>base string should be:</h2><code><pre  style="background-color: #ccc;">' + baseStr + '</pre></code>');
						res.write('<h2>sign string should be:</h2><code><pre  style="background-color: #ccc;">' + sign + '</pre></code>');
						res.write('<h2>secret</h2><code><pre style="background-color: #ccc">' + bucket['shared_secret'] + '</pre></code>');
						res.end();
					});
				})
				return;	
			}
			res.statusCode = 401;
			res.write('signing incorrect');
			res.end();
			return;
		}
		next();
	});
}



// Routes

app.get('/:schema_id/:bucket_id/*', function(req, res) {
	verifySigning(req, res, function(){
		var objectInfo = {
			bucket: req.params.bucket_id,
			schema: req.params.schema_id,
			path: req.params[0]
		};

		core.requestThumbnaild(objectInfo, function(error, data){
			if(error || !data){
				error = error ? error : {status: 500 };
				console.info(error);
				res.statusCode = error.status;
				res.write(error.message || 'Unknown error');
				res.end();
				return;
			}
			var age = 3600;
			var expires = moment().utc().add('s', age).format('ddd, D MMM YYYY HH:mm:ss') + ' GMT';
			res.set('Cache-Control', "private, max-age=" + age);
			//res.sendDate = false;
			res.set('Expires', expires);
			res.set('Pragma', 'cache');
			res.type('jpeg');
			res.end(data);
		});
	});
});

app.listen(settings.port);
console.log("Express server listening on port %d in %s mode", settings.port, app.settings.env);
