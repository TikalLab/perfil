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
		host: 'secure.meetup.com',
		pathname: '/oauth2/authorize',
		query: {
			response_type: 'code',
			client_id: config.get('meetup.client_id'),
			redirect_uri: 'http://' + config.get('meetup.redirect_domain') + '/meetup/authorized',
		}
	}
	res.redirect(url.format(redirect));
})

router.get('/authorized',function(req,res,next){
	async.waterfall([
 	    // switch the code for access token
 		function(callback){
 			var form = {
 				client_id: config.get('meetup.client_id'),
 				client_secret: config.get('meetup.client_secret'),
 				code: req.query.code,
				redirect_uri: 'http://' + config.get('meetup.redirect_domain') + '/meetup/authorized',
				grant_type: 'authorization_code'
 			}
 			request.post('https://secure.meetup.com/oauth2/access',{form: form},function(error,response,body){
 				if(error){
 					callback(error);
 				}else if(response.statusCode > 300){
 					callback(response.statusCode + ' : ' + body);
 				}else{
 					var data = JSON.parse(body);
console.log('meetup reposne: %s',util.inspect(data))
 					var accessToken = data.access_token;
					var refreshToken = data.refresh_token;
 					callback(null,refreshToken);
 				}
 			});
 		},
		function(refreshToken,callback){
			users.addMeetup(req.db,req.session.user._id.toString(),refreshToken,function(err,user){
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
