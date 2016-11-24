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

router.get('/github/basic-stats',function(req,res,next){
	widgets.githubBasicStats(req.session.user.github.access_token,function(err,data){
		if(err){
			res.send(500)
		}else{
			render(req,res,'widgets/github/basic-stats',{
				github_basic_stats: data
			})
		}
	})
})

router.get('/github/repos-tag-cloud',function(req,res,next){
	widgets.githubReposTagCloud(req.session.user.github.access_token,function(err,githubLanguagesTagCloud){
		if(err){
			res.sendStatus(500);
		}else{
			render(req,res,'widgets/github/repos-tag-cloud',{
				repos_tag_cloud: githubLanguagesTagCloud
			})
		}
	})
})

router.get('/stackoverflow/basic-stats',function(req,res,next){
	widgets.stackoverflowBasicStats(req.session.user.stackoverflow.access_token,function(err,data){
		if(err){
			res.sendStatus(500)
		}else{
			render(req,res,'widgets/stackoverflow/basic-stats',{
				stackoverflow_basic_stats: data,
			})
		}
	})
})

router.get('/stackoverflow/questions-tag-cloud',function(req,res,next){
	widgets.stackoverflowQuestionsTagCloud(req.session.user.stackoverflow.access_token,function(err,tagCloud){
		if(err){
			res.sendStatus(500)
		}else{
			render(req,res,'widgets/stackoverflow/questions-tag-cloud',{
				tag_cloud: tagCloud,
			})
		}
	})
})

router.get('/stackoverflow/answers-tag-cloud',function(req,res,next){
	widgets.stackoverflowAnswersTagCloud(req.session.user.stackoverflow.access_token,function(err,tagCloud){
		if(err){
			res.sendStatus(500)
		}else{
			render(req,res,'widgets/stackoverflow/answers-tag-cloud',{
				tag_cloud: tagCloud,
			})
		}
	})
})

router.get('/meetup/groups',function(req,res,next){
	widgets.meetupGroups(req.session.user.meetup.refresh_token,function(err,data){
		if(err){
			res.sendStatus(500)
		}else{
			render(req,res,'widgets/meetup/groups',{
				groups: data,
			})
		}
	})
})

router.get('/meetup/group-categories-tag-cloud',function(req,res,next){
	widgets.meetupGroupCategoriesTagCloud(req.session.user.meetup.refresh_token,function(err,tagCloud){
		if(err){
			res.sendStatus(500)
		}else{
			render(req,res,'widgets/meetup/group-categories-tag-cloud',{
				tag_cloud: tagCloud,
			})
		}
	})
})

router.get('/linkedin/summary',function(req,res,next){
	widgets.linkedinSummary(req.session.user.linkedin.access_token,function(err,linkedinSummary){
		if(err){
			res.sendStatus(500)
		}else{
console.log('linkedin summary: %s',util.inspect(linkedinSummary))			
			render(req,res,'widgets/linkedin/summary',{
				linkedin_summary: linkedinSummary,
			})
		}
	})
})



function render(req,res,template,params){

//	params.user = req.session.user;
//	params.alert = req.session.alert;
//	delete req.session.alert;

	params.app = req.app;
	params._ = _;
	// params.us = us;
	params.moment = moment;
	params.config = config;
	params.util = util;

	// params.alertIcons = alertIcons;
	// params.alert = req.session.alert;
	// delete req.session.alert;

	params.user = req.session.user;

	if(!('active_page' in params)){
		params.active_page = false;
	}

	if(!('isHomepage' in params)){
		params.isHomepage = false;
	}

	res.render(template,params);
}
module.exports = router;
