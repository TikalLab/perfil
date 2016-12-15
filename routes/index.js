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
var twix = require('twix');

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

router.get('/big-tag-cloud',function(req,res,next){
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
		if(err){
			console.log('err is %s',err)
		}else{
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
				// console.log('Q is %s',util.inspect(question))
				// console.log('Q date %s',question.creation_date)
				return {
					id: question.question_id,
					when: moment(Number(question.creation_date + '000')).toDate(),
					tags: question.tags,
					type: 'SO question'
				}
			}))
			events = events.concat(_.map(results[2],function(answer){
				// console.log('A date %s',answer.answer.creation_date)
				return {
					id: answer.answer.answer_id,
					when: moment(Number(answer.answer.creation_date + '000')).toDate(),
					tags: answer.question.tags,
					type: 'SO answer'
				}
			}))

			var tagCloud = {};
			_.each(events,function(event){
				_.each(event.tags,function(tag){
					if(tag in tagCloud){
						tagCloud[tag] += getEventScore(event)
					}else{
						tagCloud[tag] = getEventScore(event)
					}
				})
			})

			console.log('tagCloud is %s',util.inspect(tagCloud))

		}
	})
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

		if(err){
			console.log('err is %s',err)
		}else{
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
				// console.log('Q is %s',util.inspect(question))
				// console.log('Q date %s',question.creation_date)
				return {
					id: question.question_id,
					when: moment(Number(question.creation_date + '000')).toDate(),
					tags: question.tags,
					type: 'SO question'
				}
			}))
			events = events.concat(_.map(results[2],function(answer){
				// console.log('A date %s',answer.answer.creation_date)
				return {
					id: answer.answer.answer_id,
					when: moment(Number(answer.answer.creation_date + '000')).toDate(),
					tags: answer.question.tags,
					type: 'SO answer'
				}
			}))

			// sort the events list according to date
			events = _.sortBy(events,'when');

			// find min and max dates
			var earliestEvent = _.min(events,function(event){
				return event.when;
			})

			var latestEvent = _.max(events,function(event){
				return event.when;
			})

			// generate initial x and y
			var x = [];
			var y = [];
			var itr = moment.twix(new Date(earliestEvent.when),new Date(latestEvent.when)).iterate("months");
			while(itr.hasNext()){
				currentDate = itr.next().format('YYYY-MM');
				x.push(currentDate);
				y.push(0)
			}

			console.log('x is %s',util.inspect(x));
			console.log('y is %s',util.inspect(y));


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
					// type: 'scatter',
					fill: 'tonexty',
					x: x.slice(0),
					y: y.slice(0)
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
					// if(xIndex == -1){
					// 	traces[traceIndex].x.push(event.when);
					// 	traces[traceIndex].y.push(getEventScore(event))
					// }else{
						traces[traceIndex].y[xIndex]+=getEventScore(event)
					// }
				})
			})

			// console.log('traces are %s',util.inspect(traces))

			var tracesSums = [];
			// filter traces? show only 8 most popular
			_.each(traces,function(trace,idx){
				var sum = _.reduce(trace.y, function(memo, num){ return memo + num; }, 0);
				tracesSums.push({
					idx: idx,
					sum: sum
				})
			})

			// console.log('traces sums are: %s',tracesSums)

			tracesSums = _.sortBy(tracesSums,'sum');
			tracesSums = tracesSums.reverse()

			tracesSums = _.first(tracesSums,8)

			var filteredTraces = [];
			_.each(tracesSums,function(traceSum){
				filteredTraces.push(traces[traceSum.idx])
			})

			filteredTraces[0].fill = 'tozeroy';

			// var ret = [{"name":"facebook","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2011-05","2012-08"],"y":[20,10]},{"name":"android","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2011-08","2011-09"],"y":[20,30]},{"name":"android-manifest","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2011-08"],"y":[10]},{"name":"java","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2011-08","2011-09"],"y":[10,10]},{"name":"google-maps","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2011-08"],"y":[10]},{"name":"multithreading","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2011-09"],"y":[10]},{"name":"video","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2011-09"],"y":[10]},{"name":"hebrew","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2011-09"],"y":[10]},{"name":"media","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-01"],"y":[10]},{"name":"wordpress","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-01"],"y":[10]},{"name":"cordova","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-05"],"y":[20]},{"name":"jquery-mobile","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-05"],"y":[10]},{"name":"jquery","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-08"],"y":[10]},{"name":"facebook-javascript-sdk","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-08","2012-09"],"y":[10,10]},{"name":"fbjs","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-08"],"y":[10]},{"name":"fb.ui","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-08"],"y":[10]},{"name":"ruby-on-rails","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-09"],"y":[10]},{"name":"twitter-bootstrap","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-09","2012-10","2013-01"],"y":[10,10,10]},{"name":"datasource","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-09"],"y":[10]},{"name":"typeahead","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-09","2012-10"],"y":[10,10]},{"name":"javascript","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-09","2013-11","2013-12","2014-01","2014-02","2014-03","2014-04","2014-05","2014-06","2014-07","2014-08","2014-09","2014-10","2014-11","2014-12","2015-01","2015-02","2015-03","2015-04","2015-05","2015-06","2015-07","2015-08","2015-09","2015-10","2015-11","2015-12","2016-01","2016-02","2016-03","2016-04","2016-05","2016-06","2016-07","2016-08","2016-09","2016-10","2016-11","2016-12"],"y":[10,11,144,26,60,92,5,25,87,113,90,46,128,28,66,36,110,104,43,49,105,61,17,37,74,90,99,187,83,140,109,77,111,156,23,74,8,40,15]},{"name":"iphone","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-09"],"y":[10]},{"name":"jquery-ui","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-10"],"y":[10]},{"name":"php","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-11","2014-12","2015-06","2015-07","2015-08","2015-09","2015-10","2015-11","2016-10","2016-11"],"y":[5,23,19,61,17,17,2,3,6,8]},{"name":"powershell","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2012-11"],"y":[5]},{"name":"bootstrap-typeahead","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2013-01"],"y":[10]},{"name":"jquery-knob","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2013-02","2013-03"],"y":[10,10]},{"name":"css","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2013-03","2013-11","2013-12","2014-01","2014-02","2014-03","2014-04","2014-05","2014-06","2014-07","2014-08","2014-09","2014-10","2014-11","2014-12","2015-01","2015-02","2015-03","2015-04","2015-05","2015-06","2015-07","2015-08","2015-09","2015-10","2015-11","2015-12","2016-01","2016-02","2016-03","2016-04","2016-05","2016-06","2016-07","2016-08","2016-09","2016-10","2016-11"],"y":[10,11,144,26,44,83,4,1,87,113,90,46,128,28,66,36,110,104,43,45,46,61,17,37,74,3,44,165,73,132,101,77,110,96,12,16,8,26]},{"name":"z-index","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2013-03"],"y":[10]},{"name":"background-color","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2013-03"],"y":[10]},{"name":"geolocation","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2013-04"],"y":[10]},{"name":"instagram","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2013-04"],"y":[10]},{"name":"node.js","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2014-02","2014-03","2014-07","2015-01","2015-03","2015-06"],"y":[10,20,10,20,10,10]},{"name":"post","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2014-02"],"y":[10]},{"name":"express","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2014-02","2014-03"],"y":[10,20]},{"name":"shopify","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2014-03"],"y":[20]},{"name":"objective-c","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2014-06"],"y":[8]},{"name":"html","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2014-07","2014-08","2014-09","2014-10","2014-11","2014-12","2015-01","2015-02","2015-03","2015-04","2015-05","2015-06","2015-07","2015-08","2015-09","2015-10","2015-11","2016-01","2016-02","2016-03","2016-04","2016-05","2016-06","2016-07","2016-08","2016-09","2016-10","2016-11","2016-12"],"y":[60,89,46,128,28,43,36,110,104,43,45,46,61,17,17,27,3,152,55,129,101,77,110,97,17,47,8,26,2]},{"name":"google-api-nodejs-client","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2014-07"],"y":[10]},{"name":"facebook-graph-api","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2015-01"],"y":[20]},{"name":"amazon-s3","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2015-01"],"y":[20]},{"name":"google-drive-sdk","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2015-03"],"y":[10]},{"name":"ffmpeg","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2015-06"],"y":[10]},{"name":"shell","mode":"lines","line":{"shape":"spline"},"type":"scatter","x":["2016-01","2016-02","2016-03","2016-04","2016-05","2016-06","2016-07","2016-08","2016-09","2016-10","2016-11"],"y":[152,55,75,6,41,2,39,8,17,2,18]}]

			render(req,res,'index/timeline',{
				traces: stackedArea(filteredTraces)
			})

		}

		function stackedArea(traces) {
			for(var i=1; i<traces.length; i++) {
				for(var j=0; j<(Math.min(traces[i]['y'].length, traces[i-1]['y'].length)); j++) {
					traces[i]['y'][j] += traces[i-1]['y'][j];
				}
			}
			return traces;
		}

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

router.get('/timeline2',function(req,res,next){
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

		if(err){
			console.log('err is %s',err)
		}else{
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
				// console.log('Q is %s',util.inspect(question))
				// console.log('Q date %s',question.creation_date)
				return {
					id: question.question_id,
					when: moment(Number(question.creation_date + '000')).toDate(),
					tags: question.tags,
					type: 'SO question'
				}
			}))
			events = events.concat(_.map(results[2],function(answer){
				// console.log('A date %s',answer.answer.creation_date)
				return {
					id: answer.answer.answer_id,
					when: moment(Number(answer.answer.creation_date + '000')).toDate(),
					tags: answer.question.tags,
					type: 'SO answer'
				}
			}))

			// sort the events list according to date
			events = _.sortBy(events,'when');

			// find min and max dates
			var earliestEvent = _.min(events,function(event){
				return event.when;
			})

			var latestEvent = _.max(events,function(event){
				return event.when;
			})

			// generate initial x and y
			var x = [];
			var y = [];
			var itr = moment.twix(new Date(earliestEvent.when),new Date(latestEvent.when)).iterate("months");
			while(itr.hasNext()){
				currentDate = itr.next().format('YYYY-MM');
				y.push(currentDate);
			}

			console.log('x is %s',util.inspect(x));
			console.log('y is %s',util.inspect(y));


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

			var xs = [];
			var traces = [];
			var colors = ['blue','green','red','yellow','grey','purple','pink','orange']

			var c = 0;
			_.each(tags,function(tag){
				xs[tag] = [];
				_.each(y,function(when){
					var val = _.reduce(events,function(memo,event){
						var ret = 0;
						var loweredCaseTags = _.map(event.tags,function(eventTag){
							return eventTag.toLowerCase()
						})
						if(_.contains(loweredCaseTags,tag) && event.when == when){
							ret = getEventScore(event)
						}
						return memo + ret;
					},0)
					xs[tag].push(val)
				})
				traces.push({
					x: xs[tag],
					y: y,
					name: tag,
					orientation: 'h',
					marker: {
						color: colors[c % 8],
						width: 5
					},
					type: 'bar'
				})
				c++;
			})

			// now reduce the number of traces...
			var tracesSums = [];
			// filter traces? show only 8 most popular
			_.each(traces,function(trace,idx){
				var sum = _.reduce(trace.x, function(memo, num){ return memo + num; }, 0);
				tracesSums.push({
					idx: idx,
					sum: sum
				})
			})

			// console.log('traces sums are: %s',tracesSums)

			tracesSums = _.sortBy(tracesSums,'sum');
			tracesSums = tracesSums.reverse()

			tracesSums = _.first(tracesSums,8)

			var filteredTraces = [];
			_.each(tracesSums,function(traceSum){
				filteredTraces.push(traces[traceSum.idx])
			})



			render(req,res,'index/timeline2',{
				traces: filteredTraces
			})


		}


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
