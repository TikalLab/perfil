var express = require('express');
var router = express.Router();
var util = require('util');
var config = require('config');
var url = require('url');
var async = require('async');
var request = require('request');
var _ = require('underscore');
var moment = require('moment')
// var github = require('../app_modules/github');
var errorHandler = require('../app_modules/error');
var github = require('../app_modules/github');
var stackoverflow = require('../app_modules/stackoverflow');
var linkedin = require('../app_modules/linkedin');
var meetup = require('../app_modules/meetup');
var widgets = require('../app_modules/widgets');

var users = require('../models/users');

var widgets = {
	'github-basic-stats': widgets.githubBasicStats
}


router.get('/user/:platform/:id',function(req,res,next){
	async.waterfall([
		// get user
		function(callback){
			users.getByPlatformAndID(req.db,req.params.platform,req.params.id,function(err,user){
				callback(err,user)
			})
		},
		function(user,callback){

console.log('user is %s',util.inspect(user))

			var ret = {};
			async.each(user.widgets,function(widget,callback){
				invoke(widget,user,function(err,data){
console.log('ret from invoke!')
					if(err){
						callback(err)
					}else{
						ret[widget] = data;
						callback()
					}
				})
			},function(err){
				callback(err,ret)
			})
		}
	],function(err,ret){
		if(err){
			res.sendStatus(500);
		}else{
			res.json(ret);
		}
	})

})

function invoke(widget,user,callback){
	console.log('invoking %s',widget)
	switch(widget){
		case 'github-basic-stats':
		console.log('access tpken is %s',user.github.access_token)

			widgets.githubBasicStats(user.github.access_token,function(err,data){
				callback(err,data)
			});
			break;
		case 'github-repos-tag-cloud':
			widgets.githuReposTagCloud(user.github.access_token,callback);
			break;
		default:
			callback(null,null)
		  break;
	}
}


module.exports = router;
