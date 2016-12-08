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

var users = require('../models/users');


router.get('/',function(req,res,next){
	if(!req.session.user){
		render(req,res,'index/homepage',{})
	}else{
		res.redirect('/dashboard')
	}
})

router.get('/dashboard',function(req,res,next){
	// render(req,res,'index/dashboard',{})
	render(req,res,'index/dashboard2',{})
})

router.get('/logout',function(req,res,next){
	delete req.session.user;
	res.redirect('/')
})

router.get('/timeline',function(req,res,next){
	// render(req,res,'index/dashboard',{})

	async.parallel([
		function(callback){
			github.getUserCommitsWithLanguageTag(req.session.user.github.access_token,function(err,commits){
				callback(err,commits)
			})
		},
		function(callback){
			stackoverflow.getUserQuestions(req.session.user.stackoverflow.access_token,function(err,questions){
// console.log('sample question: %s',util.inspect(questions[0]))
				callback(err,questions)
			})
		},
		function(callback){
			stackoverflow.getUserAnswers(req.session.user.stackoverflow.access_token,function(err,answers){
// console.log('sample answers: %s',util.inspect(answers[0]))
				callback(err,answers)
			})
		},
	],function(err,results){
		var events = [];
		events = events.concat(_.map(results[0],function(commit){
			return {
				id: commit.sha,
				when: moment(commit.commit.author.date).toDate(),
				tags: commit.repo_languages,
				type: 'GH commit'
			}
			// commit['type'] = 'commit';
			// commit['when'] = moment(commit['when']).toDate()
			// return commit;
		}))
		events = events.concat(_.map(results[1],function(question){
			return {
				id: question.question_id,
				when: moment(question.creation_date).toDate(),
				tags: question.tags,
				type: 'SO question'
			}
		}))
		events = events.concat(_.map(results[2],function(answer){
			return {
				id: answer.answer.answer_id,
				when: moment(answer.answer.creation_date).toDate(),
				tags: answer.question.tags,
				type: 'SO answer'
			}
		}))

		// sort the events list according to date
		events = _.sortBy(events,'when');

		// flatten all the dates
		events = _.map(events,function(event){
			event.when = moment(event.when).format('YYYY-MM-DD');
			event.when = moment(event.when).format('YYYY-MM');
			return event;
		})

		// create a list of all possible tags
		var tags = _.map(events,function(event){
			return event.tags;
		})

		tags = _.flatten(tags)

		tags = _.map(tags,function(tag){
			return tag.toLowerCase()
		})

		tags = _.uniq(tags)

		var traces = [];
		_.each(tags,function(tag){
			traces.push({
				name: tag,
				mode: 'lines',
				line : {
					shape: 'spline'
				},
				type: 'scatter',
				x: [],
				y: []
			})
		})

		_.each(events,function(event){
			_.each(event.tags,function(tag){
				tag = tag.toLowerCase()

				traceIndex = _.findIndex(traces,function(trace){
					return trace.name == tag;
				})

				var xIndex = _.findIndex(traces[traceIndex].x,function(x){
					return x == event.when
				})
				if(xIndex == -1){
					traces[traceIndex].x.push(event.when);
					traces[traceIndex].y.push(getEventScore(event))
				}else{
					traces[traceIndex].y[xIndex]+=getEventScore(event)
				}
			})
		})

		console.log('traces are %s',util.inspect(traces))

		render(req,res,'index/timeline',{
			traces: traces
		})

		// var traces = [];
		// _.each(events,function(event){
		//
		// 	var date = moment(event.when).format('YYYY-MM-DD')
		//
		// 	_.each(event.tags,function(tag){
		// 		traceIndex = _.findIndex(traces,function(trace){
		// 			return trace.name = tag;
		// 		})
		// 		traces[traceIndex].
		//
		// 	})
		// })

		// console.log('grand list is %s',util.inspect(events));
		//
		// console.log('grand list size is %s',events.length);

	})


	// render(req,res,'index/timeline',{})
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

router.post('/save',function(req,res,next){
	console.log(util.inspect(req.body))

	var widgets = _.keys(req.body)

	users.saveWidgets(req.db,req.session.user._id.toString(),widgets,function(err,user){
		if(err){
			res.sendStatus(500);
		}else{
			req.session.user = user;
			res.sendStatus(200);
		}
	})
})



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
		function(callback){
			stackoverflow.getUserAnswers(req.session.user.stackoverflow.access_token,function(err,stackoverflowAnswers){
				callback(err,stackoverflowAnswers)
			})
		},
		function(callback){
			stackoverflow.getUserQuestions(req.session.user.stackoverflow.access_token,function(err,stackoverflowQuestions){
				callback(err,stackoverflowQuestions)
			})
		},
		function(callback){
			github.getReposCounts(req.session.user.github.access_token,function(err,githubReposCounts){
				callback(err,githubReposCounts)
			})
		},
		function(callback){
			github.getLanguagesTagCloud(req.session.user.github.access_token,function(err,githubLanguagesTagCloud){
				callback(err,githubLanguagesTagCloud)
			})
		},
		function(callback){
			meetup.getUserGroups(req.session.user.meetup.refresh_token,function(err,meetupGroups){
				callback(err,meetupGroups)
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
				linkedin: results[2],
				stackoverflow_answers: results[3],
				stackoverflow_questions: results[4],
				github_repos_counts: results[5],
				github_languages_tag_cloud: results[6],
				meetup_groups: results[7]
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
