#!/usr/bin/env node
var fs = require('fs')
	, path = require('path')
	, goDaedmon = require('daemon')
	, argv = require('optimist').argv
	, deepExtend = require('deep-extend')
	, forever = require("forever-monitor")
	;
var settings = deepExtend({
	port: 8011,
	retry: 1
}, argv);
var pidFile = __dirname + '/tmp/' + settings['port'] + '.pid';



function start(){
	if (fs.existsSync(pidFile)){
		console.error('Pid file already exists');
		return;
	}
	function daemon(){
		console.log('Server up and running, go background.');
		console.info(pidFile);
		goDaedmon();
		fs.writeFile(pidFile, process.pid);
	}
	console.info("Server started");

	var child = new (forever.Monitor)('app.js', {
		max: settings['retry'],
		silent: false,
		options: ['-port', settings['port']]
	});

	child.on('exit', function () {
		clearTimeout(daemon);
		process.exit(1);
	});
	child.on('start', function () {
		setTimeout(daemon, 5 * 1000);
	});
	child.start();

}
function stop(callback){

	if (!fs.existsSync(pidFile)){
		console.error("Pid file doesn't exists");
		console.info(pidFile);
		return;
	}
    forever.kill(parseInt(fs.readFileSync(pidFile)), true, 'SIGKILL', function(){
		fs.unlinkSync(pidFile);
		console.info("Server stopped");
		callback();
    });
}

if (argv._ == 'start'){
	start();
}else if(argv._ == 'stop'){
	stop(function(){

	});
}else if(argv._ == 'restart'){
	
	stop(function(){
		start();
	});
}