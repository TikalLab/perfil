var express = require('express');
var router = express.Router();
var util = require('util');
var config = require('config');
var url = require('url');
var async = require('async');
var request = require('request');
var _ = require('underscore');
var moment = require('moment')
var twix = require('twix')
// var github = require('../app_modules/github');
var errorHandler = require('../app_modules/error');
var github = require('../app_modules/github');
var stackoverflow = require('../app_modules/stackoverflow');
var linkedin = require('../app_modules/linkedin');
var meetup = require('../app_modules/meetup');
var widgets = require('../app_modules/widgets');

var users = require('../models/users');

router.get('/trend/:user_id',function(req,res,next){
	render(req,res,'index/test4',{
		user_id: req.params.user_id
	})
})
router.get('/trends/:user_id',function(req,res,next){
	var events = req.db.get('events');
	events.find({user_id: req.params.user_id},function(err,events){
		if(err){
			console.log('err is %s',err)
			res.sendStatus(500)
		}else{
			var tags = [];
			_.each(events,function(event){
				_.each(event.tags,function(tag){
					tags.push(tag)
				})
			})

			tags = _.uniq(tags);
console.log('tags are %s',util.inspect(tags))
			tags = _.sortBy(tags,function(tag){
				return tag.toLowerCase()
			})

			var tagCloud = _.countBy(tags,function(tag){
				return tag;
			})

			tagCloud = _.mapObject(tagCloud,function(val,key){
				return 0;
			})

			_.each(events,function(event){
				_.each(event.tags,function(tag){
					tagCloud[tag] += getEventScore(event)
				})
			})

			// console.log('tagCloud is %s',util.inspect(tagCloud))

			var values = _.values(tagCloud);
			var min = _.min(values);
			var max = _.max(values);

			var invertedCloud = _.invert(tagCloud);
			var keys = _.keys(invertedCloud).sort(function(a,b){return Number(a) - Number(b)}).reverse();
			console.log('keys is %s',util.inspect(keys))
			var big5 = _.first(keys,5)
			var big5Tags = [];
			_.each(big5,function(val){
				big5Tags.push(invertedCloud[val])
			})

			console.log('big 5 are: %s',util.inspect(big5Tags))

			// sort the events list according to date
			events = _.sortBy(events,'when');


			// filter out events out of the big5Tags
			events = _.filter(events,function(event){
				return _.intersection(event.tags,big5Tags).length > 0
			})

			// find min and max dates
			var earliestEvent = _.min(events,function(event){
				return event.when;
			})

			var latestEvent = _.max(events,function(event){
				return event.when;
			})

			// generate initial x and y
			var x = [];
			var itr = moment.twix(new Date(earliestEvent.when),new Date(latestEvent.when)).iterate("months");
			while(itr.hasNext()){
				currentDate = itr.next().format('YYYY-MM');
				x.push(currentDate);
			}

			// x = x.reverse();

			// flatten all the dates
			events = _.map(events,function(event){
				event.when = moment(event.when).format('YYYY-MM');
				return event;
			})

			var traces = [];

			// create a score graph for each of the big 5 tags
			_.each(big5Tags,function(big5Tag){
				var y = [];
				_.each(x,function(x1){
					var value = 0;
					var relevantEvents = _.filter(events,function(event){
						return (_.contains(event.tags,big5Tag) && event.when == x1);
					})
					value = _.reduce(relevantEvents,function(memo,event){
						return memo + getEventScore(event)
					},0)
					y.push(value);
				})
				traces.push({
					name: big5Tag,
					// line: {
					//   shape: 'spline'
					// },
					type: 'scatter',
					x: x,
					y: y
				})
			})

			console.log('trends is %s',util.inspect(traces,{depth:8}))

			res.json({
				trends: traces
			})


		}
	})


})



router.get('/tag-distribution',function(req,res,next){
	var events = req.db.get('events');

	events.aggregate([
		{$match: {
			tags: req.query.tag
		}},
		{$group: {_id: '$type',count:{$sum:1}}}
	],function(err,data){
		data.push({
			_id: 'MU RSVP',
			count: 0
		})
		console.log('tag dist is %s',util.inspect(data))
		res.json(data)
	})


})


function getEventScore(event){
	var ret = 0;
	switch (event.type){
		case 'GH commit':
		ret = 1;
		break;
		case 'SO answer':
		ret = 10;
		break;
		case 'SO question':
		ret = 10;
		break;
	}
	return ret;
}

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
