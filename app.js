#!/usr/bin/env node
var argv = require('optimist').argv
	, deepExtend = require('deep-extend')
	, path = require('path')
	;
var settings = deepExtend({
	port: 8011,
	home: '.'
}, argv);

global.THUMBNAILD_HOME = path.resolve(settings['home']);

var express = require('express')
	, fs = require('fs')
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
app.get('/:schema/:bucket/*', core.getThumbnail);
app.listen(settings.port);
console.log("Express server listening on port %d in %s mode", settings.port, app.settings.env);
