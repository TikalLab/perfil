var config = require('config');
var request = require('request');
var _ = require('underscore');
var async = require('async');
var parseLinkHeader = require('parse-link-header');
var util = require('util');
var atob = require('atob')
// var simpleGit = require('simple-git')()
var fs = require('fs')
var fse = require('fs-extra')
var url = require('url');
var slug = require('slug')
var exec = require('child_process').exec;


module.exports = {
	getUser: function(accessToken,callback){
		var qs = {
			site: 'stackoverflow.com',
			key: config.get('stackoverflow.key'),
			access_token: accessToken
		}
		// console.log('headers are %s',util.inspect(headers))
		request('https://api.stackexchange.com/me',{qs: qs, gzip: true},function(error,response,body){
			if(error){
				callback(error);
			}else if(response.statusCode > 300){
				// console.log('error in getUser')
				callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
			}else{
console.log('so ret is: %s',body)
				var data = JSON.parse(body);
				callback(null,data)
			}
		})
	},


}
