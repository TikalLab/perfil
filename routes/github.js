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
		host: 'github.com',
		pathname: '/login/oauth/authorize',
		query: {
			client_id: config.get('github.client_id'),
			redirect_uri: 'http://' + config.get('github.redirect_domain') + '/github/authorized',
			// scope: 'repo'
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
 			}
 			var headers = {
 				Accept: 'application/json'
 			}
 			request.post('https://github.com/login/oauth/access_token',{form: form, headers: headers},function(error,response,body){
 				if(error){
 					callback(error);
 				}else if(response.statusCode > 300){
 					callback(response.statusCode + ' : ' + body);
 				}else{
 					var data = JSON.parse(body);
 					var accessToken = data.access_token;
 					callback(null,accessToken);
 				}
 			});
 		},
		function(accessToken,callback){
			users.addGitHub(req.db,req.session.user._id.toString(),accessToken,function(err,user){
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
