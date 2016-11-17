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
	refreshToken: function(refreshToken,callback){

		// console.log('headers are %s',util.inspect(headers))
		var form = {
			client_id: config.get('meetup.client_id'),
			client_secret: config.get('meetup.client_secret'),
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		}
		request('https://secure.meetup.com/oauth2/access',{form: form},function(error,response,body){
			if(error){
				callback(error);
			}else if(response.statusCode > 300){
				// console.log('error in getUser')
				callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
			}else{
				var data = JSON.parse(body);
				callback(null,data.access_token)
			}
		})
	},


}
