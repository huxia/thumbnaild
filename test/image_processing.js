var assert = require("assert");
var imageProcessor = require('../image_processor');
var im = require('imagemagick');
var fs = require('fs');

var srcPath = __dirname + '/IMG_5491.JPG';
describe("image processing", function(){
	it("imagemagick test", function(done){
		var dstPath = __dirname + '/IMG_5491-resized.JPG';
		if(fs.existsSync(dstPath)) fs.unlinkSync(dstPath);
		im.resize({
			srcPath: srcPath,
			format: 'jpg',
			dstPath: dstPath,
			width: 100,
			height: 100
		}, function(err, stdout, stderr){
			if(err || !fs.existsSync(dstPath)){
				console.info('err:');
				console.info(err);
				console.info('-');
				console.info('stdout:');
				console.info(stdout);
				console.info('-');
				console.info('stderr:');
				console.info(stderr);
				return;
			}
			if(fs.existsSync(dstPath)) fs.unlinkSync(dstPath);
			done();
		})
	});
	it("image process test", function(done){
		
		imageProcessor.processImage([{"function": "resize", "arguments": {
			"width": 150,
			"height": 100,
			"strip": false,
			"format": "jpg"
		}},{"function": "crop", "arguments": {
			"width": 50,
			"height": 50,
			"format": "jpg"
		}}], fs.readFileSync(srcPath), function(err, data){
			if(err || !data){
				console.info('err:');
				console.info(err);
				return;
			}
			done();
		})
	});
});