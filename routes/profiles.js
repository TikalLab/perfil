var express = require('express');
var router = express.Router();
var util = require('util');
var config = require('config');
var url = require('url');
var async = require('async');
var request = require('request');
var _ = require('underscore');
var moment = require('moment')
var math = require('mathjs')
// var github = require('../app_modules/github');
var errorHandler = require('../app_modules/error');
var github = require('../app_modules/github');
var stackoverflow = require('../app_modules/stackoverflow');
var linkedin = require('../app_modules/linkedin');
var meetup = require('../app_modules/meetup');

var users = require('../models/users');



router.get('/:platform/:id',function(req,res,next){
	var url = util.format('http://%s/api/user/%s/%s',config.get('app.domain'),req.params.platform,req.params.id)
	request(url,function(error,response,body){
		if(error){
			errorHandler.error(req,res,next,error);
		}else if(response.statusCode >= 300){
			errorHandler.error(req,res,next,body);
		}else{
			var json = JSON.parse(body);
			console.log('json to render: %s',util.inspect(json))
			// render(req,res,'profiles/zwin',json)
			render(req,res,'profiles/shiftcv',json)
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
	params.math = math;

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
