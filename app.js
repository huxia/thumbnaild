
/**
 * Module dependencies.
 */

var express = require('express')
	, fs = require('fs')
	, path = require('path')
	, moment = require('moment')
	, core = require('./core')
	;

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




// Routes

// schema example: 
// resize[width=50%,height=50%,quality=0.2]
// crop[width=50,height=50]
app.get('/:schema_id/:bucket_id/*', function(req, res) {
	var objectInfo = {
		bucket: req.params.bucket_id,
		schema: req.params.schema_id,
		path: req.params[0]
	};


	core.requestThumbnail(objectInfo, function(error, data){
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

app.listen(3000);
console.log("Express server listening on port %d in %s mode", 3000, app.settings.env);
