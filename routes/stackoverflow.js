var express = require('express');
var router = express.Router();
var util = require('util');
var config = require('config');
var url = require('url');
var async = require('async');
var request = require('request');
var _ = require('underscore');
var qs = require('qs');
// var github = require('../app_modules/github');
var errorHandler = require('../app_modules/error');

var users = require('../models/users');

router.get('/authorize',function(req,res,next){
	var redirect = {
		protocol: 'https',
		host: 'stackexchange.com',
		pathname: '/oauth',
		query: {
			client_id: config.get('stackoverflow.client_id'),
			redirect_uri: 'http://' + config.get('stackoverflow.redirect_domain') + '/stackoverflow/authorized',
			scope: 'no_expiry'
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
 				client_id: config.get('stackoverflow.client_id'),
 				client_secret: config.get('stackoverflow.client_secret'),
 				code: req.query.code,
				redirect_uri: 'http://' + config.get('stackoverflow.redirect_domain') + '/stackoverflow/authorized',
 			}
 			request.post('https://stackexchange.com/oauth/access_token',{form: form},function(error,response,body){
 				if(error){
 					callback(error);
 				}else if(response.statusCode > 300){
 					callback(response.statusCode + ' : ' + body);
 				}else{
					console.log('stackoverflow reposne: %s',body)
					var data = qs.parse(body)
 				// 	var data = JSON.parse(body);
console.log('stackoverflow reposne: %s',util.inspect(data))
 					var accessToken = data.access_token;
 					callback(null,accessToken);
 				}
 			});
 		},
		function(accessToken,callback){
			users.addStackOverflow(req.db,req.session.user._id.toString(),accessToken,function(err,user){
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
