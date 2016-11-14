//var express = require('express');
//var router = express.Router();
//var util = require('util');
//var config = require('config');
//var url = require('url');
//var async = require('async');
//var request = require('request');
//var _ = require('underscore');
//var async = require('async');
//var fs = require('fs');
//var path = require('path');
//
//module.exports = router;
//
//router.get('/authorize',function(req,res,next){
//	req.passport.authenticate('google', { scope: [
//      'https://www.googleapis.com/auth/plus.login',
//      'https://www.googleapis.com/auth/plus.profile.emails.read'
//    ] });
//})
//
//router.get('/authorized',function(req,res,next){
//	passport.authenticate('google', { failureRedirect: '/' }),
//	    res.redirect('/account');
//})
var express = require('express');
var router = express.Router();
var util = require('util');
var config = require('config');
var url = require('url');
var async = require('async');
var request = require('request');
var _ = require('underscore');
var errorHandler = require('../app_modules/error');

router.get('/authorize',function(req,res,next){
	var redirect = {
		protocol: 'https',
		host: 'accounts.google.com',
		pathname: '/o/oauth2/v2/auth',
		query: {
			client_id: config.get('google.client_id'),
			redirect_uri: 'http://' + config.get('google.redirect_domain') + '/google/authorized',
			scope: 'email profile',
			response_type: 'code'
		}
	}
	res.redirect(url.format(redirect));
})

router.get('/authorized',function(req,res,next){
	async.waterfall([
 	    // switch the code for access token
 		function(callback){
 			var form = {
 				client_id: config.get('google.client_id'),
 				client_secret: config.get('google.client_secret'),
 				code: req.query.code,
 				redirect_uri: 'http://' + config.get('google.redirect_domain') + '/google/authorized',
 				grant_type: 'authorization_code'
 			}
 			request.post('https://www.googleapis.com/oauth2/v4/token',{form: form},function(error,response,body){
 				if(error){
 					callback(error);
 				}else if(response.statusCode > 300){
 					callback(response.statusCode + ' : ' + body);
 				}else{
 					var data = JSON.parse(body);
console.log('got from googile: %s',body)
 					var accessToken = data.access_token;
 					callback(null,accessToken);
 				}
 			});
 		},
 		// get the google user record
 		function(accessToken,callback){
 			var headers = {
 				Authorization: 'Bearer ' + accessToken
 			}
 			request('https://www.googleapis.com/plus/v1/people/me',{headers: headers},function(error,response,body){
 				if(error){
 					callback(error);
 				}else if(response.statusCode > 300){
 					callback(response.statusCode + ' : ' + body);
 				}else{
 					var profile = JSON.parse(body);
console.log('profile is %s',util.inspect(profile))
 					callback(null,accessToken,profile);
 				}
 			});
 		},
 		// insert/update the user record to db
 		function(accessToken,profile,callback){
 			var users = req.db.get('users');
 			var email = profile.emails[0].value;
 			var google = {
 				id: profile.id,
 				display_name: profile.displayName,
 				name: profile.name,
 				access_token: accessToken,
 				avatar_url: profile.image.url
 			}

 			var updateSet = {
				$setOnInsert: {
					email: email,
					created_at: new Date()
	 			},
 				$set: {
 					google: google,
 				}
 			}

// 			var setOnInsert = {
//				email: email,
//				created_at: new Date()
// 			};


 			users.findAndModify({
 				'google.id': google.id
 			},updateSet,{
 				upsert: true,
 				new: true
 			},function(err,user){
 				callback(err,user)
 			});
 		}
 	],function(err,user){
 		if(err){
 			errorHandler.error(req,res,next,err);
 		}else{
 			req.session.user = user;
 			var next = req.session.afterReconnectGoTo;
 			delete req.session.afterReconnectGoTo;
 			if(!next){
 				next = '/';
 			}
 			res.redirect(next);
 		}
 	});
})


module.exports = router;
