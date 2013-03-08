var assert = require("assert");
var core = require('../core');
var request1Secret = "a";
var request1Unsigned = {url: 'http://band2302.com/?f=2&a[]=b&a[]=c&e=f&&', body:{'sd': 'sdsd', '21323':'sad+-23'}, files: {'aa' : new Buffer('File Content')}};
var request1BaseString = "GET http://band2302.com/?a[]=b&a[]=c&e=f&f=2\n21323=sad%2B-23&__file_aa_md5=8f621b5f7e1f8e449c223de4fe38f118&sd=sdsd";
var request1Signing = "d4320dd69a4e2214e1a285fe7ca2ccb2db98ec3e";
var request1Signed = {url: 'http://band2302.com/?f=2&a[]=b&a[]=c&e=f&sign=' + request1Signing + '&&&&', body:{'sd': 'sdsd', '21323':'sad+-23'}, files: {'aa' : new Buffer('File Content')}};
var request1Fake = {url: 'http://band2302.com/?f=2&a[]=b&a[]=c&e=f&sign=FAKE' + request1Signing + '&&&&', body:{'sd': 'sdsd', '21323':'sad+-23'}, files: {'aa' : new Buffer('File Content')}};

describe("request 1 signing", function(){
	it("should return correct base string", function(done){
		core.getRequestSigningBaseString(request1Unsigned, function(err, baseStr){
			assert(!err);
			assert(baseStr == request1BaseString);
			done();
		});
	});
	it("should return correct signing string", function(done){
		core.getRequestSigning(request1Unsigned, request1Secret, function(err, sign){
			assert(!err);
			assert(sign == request1Signing);
			done();
		});
	});
	it("should accept signed request", function(done){
		core.verifyHttpRequestSigning(request1Signed, request1Secret, function(ok){
			assert(ok);
			done();
		});
	});
	it("should reject fake request", function(done){
		core.verifyHttpRequestSigning(request1Fake, request1Secret, function(ok){
			assert(!ok);
			done();
		});
	});
});