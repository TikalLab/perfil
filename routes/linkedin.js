var express = require('express');
var router = express.Router();
var util = require('util');
var config = require('config');
var url = require('url');
var async = require('async');
var request = require('request');
var _ = require('underscore');
// var github = require('../app_modules/github');
var errorHandler = require('../app_modules/error');

var users = require('../models/users');

router.get('/authorize',function(req,res,next){
	var redirect = {
		protocol: 'https',
		host: 'www.linkedin.com',
		pathname: '/oauth/v2/authorization',
		query: {
			response_type: 'code',
			client_id: config.get('github.client_id'),
			redirect_uri: 'http://' + config.get('linkedin.redirect_domain') + '/linkedin/authorized',
			state: 'linkedinapisucks'
			// scope: 'repo'
//			scope: 'repo:status'

		}
	}
	res.redirect(url.format(redirect));
})

router.get('/authorized',function(req,res,next){
	async.waterfall([
 	    // switch the code for access token
 		function(callback){
 			var form = {
 				client_id: config.get('github.client_id'),
 				client_secret: config.get('github.client_secret'),
 				code: req.query.code,
				redirect_uri: 'http://' + config.get('linkedin.redirect_domain') + '/linkedin/authorized',
				grant_type: 'authorization_code'
 			}
 			request.post('https://github.com/login/oauth/access_token',{form: form},function(error,response,body){
 				if(error){
 					callback(error);
 				}else if(response.statusCode > 300){
 					callback(response.statusCode + ' : ' + body);
 				}else{
 					var data = JSON.parse(body);
console.log('linkedin reposne: %s',util.inspect(data))					
 					var accessToken = data.access_token;
 					callback(null,accessToken);
 				}
 			});
 		},
		function(accessToken,callback){
			users.addLinkedIn(req.db,req.session.user._id.toString(),accessToken,function(err,user){
				callback(err,user)
			})
		}
 	],function(err,user){
 		if(err){
 			errorHandler.error(req,res,next,err);
 		}else{
 			req.session.user = user;
 			var next = req.session.afterGithubRedirectTo;
 			delete req.session.afterGithubRedirectTo;
 			res.redirect(next);
 		}
 	});
})


module.exports = router;
