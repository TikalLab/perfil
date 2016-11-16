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

var users = require('../models/users');

router.get('/user',function(req,res,next){
	console.log('user is: %s',util.inspect(req.session.user))
	async.parallel([
		function(callback){
			github.getUser(req.session.user.github.access_token,function(err,githubUser){
				callback(err,githubUser)
			})
		},
		function(callback){
			stackoverflow.getUser(req.session.user.stackoverflow.access_token,function(err,stackoverflowUser){
				callback(err,stackoverflowUser)
			})
		},
		function(callback){
			linkedin.getUser(req.session.user.linkedin.access_token,function(err,linkedinUser){
				callback(err,linkedinUser)
			})
		},
	],function(err,results){
		if(err){
			errorHandler.error(req,res,next,err);
		}else{
			console.log('results are: %s',util.inspect(results,{depth:8}))
			render(req,res,'index/user',{
				github: results[0],
				stackoverflow: results[1],
				linkedin: results[2]
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
