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




router.get('/user/:platform/:id',function(req,res,next){
	async.waterfall([
		// get user
		function(callback){
			users.getByPlatformAndID(req.db,req.params.platform,req.params.id,function(err,user){
				callback(err,user)
			})
		},
		function(user,callback){
			var ret = {};

			// ignore saved widgets and force our own default set
			var widgets = ['big-tag-cloud'];
			if('github' in user){
				widgets.push('github-profile-link')
			}
			if('linkedin' in user){
				widgets.push('linkedin-summary')
				widgets.push('linkedin-profile-link')
			}
			if('stackoverflow' in user){
				widgets.push('stackoverflow-profile-link')
			}
			if('meetup' in user){
				widgets.push('meetup-profile-link')
			}
			async.each(widgets,function(widget,callback){
			// async.each(user.widgets,function(widget,callback){
				invoke(widget,user,req.db,function(err,data){
					if(err){
						callback(err)
					}else{
						ret[widget.replace(/-/g,'_')] = data;
						callback()
					}
				})
			},function(err){
				callback(err,ret)
			})
		}
	],function(err,ret){
		if(err){
			console.log('err is %s',err)
			res.sendStatus(500);
		}else{
			res.json(ret);
		}
	})

})

function invoke(widget,user,db,callback){
	console.log('invoking %s',widget)
	switch(widget){
		case 'github-profile-link':
			widgets.githubProfileLink(user.github.access_token,callback);
			break;
		case 'github-basic-stats':
			widgets.githubBasicStats(user.github.access_token,callback);
			break;
		case 'github-repos-tag-cloud':
			widgets.githubReposTagCloud(user.github.access_token,callback);
			break;
		case 'stackoverflow-profile-link':
			widgets.stackoverflowProfileLink(user.stackoverflow.access_token,callback);
			break;
		case 'stackoverflow-basic-stats':
			widgets.stackoverflowBasicStats(user.stackoverflow.access_token,callback);
			break;
		case 'stackoverflow-questions-tag-cloud':
			widgets.stackoverflowQuestionsTagCloud(user.stackoverflow.access_token,callback);
			break;
		case 'stackoverflow-answers-tag-cloud':
			widgets.stackoverflowAnswersTagCloud(user.stackoverflow.access_token,callback);
			break;
		case 'meetup-profile-link':
			widgets.meetupProfileLink(user.meetup.refresh_token,callback);
			break;
		case 'meetup-groups':
			widgets.meetupGroups(user.meetup.refresh_token,callback);
			break;
		case 'meetup-group-categories-tag-cloud':
			widgets.meetupGroupCategoriesTagCloud(user.meetup.refresh_token,callback);
			break;
		case 'linkedin-profile-link':
			widgets.linkedinProfileLink(user.linkedin.access_token,callback);
			break;
		case 'linkedin-summary':
			widgets.linkedinSummary(user.linkedin.access_token,callback);
			break;
		case 'big-tag-cloud':
			widgets.bigTagCloud(user._id.toString(),user.github.access_token,user.stackoverflow.access_token,db,callback);
			break;
		default:
			callback(null,null)
		  break;
	}
}


module.exports = router;
