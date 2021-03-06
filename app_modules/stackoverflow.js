var config = require('config');
var request = require('request');
var _ = require('underscore');
var async = require('async');
var parseLinkHeader = require('parse-link-header');
var util = require('util');
var atob = require('atob')
// var simpleGit = require('simple-git')()
var fs = require('fs')
var fse = require('fs-extra')
var url = require('url');
var slug = require('slug')
var exec = require('child_process').exec;
var moment = require('moment')
var events = require('../models/events')

module.exports = {
	getUser: function(accessToken,callback){
		var qs = {
			site: 'stackoverflow.com',
			key: config.get('stackoverflow.key'),
			access_token: accessToken
		}
		// console.log('headers are %s',util.inspect(headers))
		request('https://api.stackexchange.com/me',{qs: qs, gzip: true},function(error,response,body){
			if(error){
				callback(error);
			}else if(response.statusCode > 300){
				// console.log('error in getUser')
				callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
			}else{
				var data = JSON.parse(body);
				callback(null,data)
			}
		})
	},
	getUserAnswers: function(accessToken,callback){


		async.waterfall([
			// get answers
			function(callback){
				var answers = [];
				var page = 1;

				async.whilst(
					function(){
						return page;
					},
					function(callback){
						var qs = {
							site: 'stackoverflow.com',
							key: config.get('stackoverflow.key'),
							access_token: accessToken,
							filter: 'withbody',
							page: page
						}
						request('https://api.stackexchange.com/me/answers',{qs: qs, gzip: true},function(error,response,body){
							if(error){
								callback(error);
							}else if(response.statusCode > 300){
								// console.log('error in getUser')
								callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
							}else{
								var data = JSON.parse(body);
								answers = answers.concat(data.items)
								page = (data.has_more ? page + 1 : false)
								callback(null,answers)
							}
						})

					},
					function(err,answers){
						callback(err,answers)
					}
				);
			},
			// for each answer, get question...
			function(answers,callback){

				var userAnswers = [];
				async.each(answers,function(answer,callback){

					var qs = {
						site: 'stackoverflow.com',
						key: config.get('stackoverflow.key'),
						access_token: accessToken
					}
					var url = util.format('https://api.stackexchange.com/questions/%s',answer.question_id);
					request(url,{qs: qs, gzip: true},function(error,response,body){
						if(error){
							callback(error);
						}else if(response.statusCode > 300){
							// console.log('error in getUser')
							callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
						}else{
							var data = JSON.parse(body);
							var question = data.items[0]
							userAnswers.push({
								question: question,
								answer: answer
							})
							callback()
						}
					})
				},function(err){
					callback(err,userAnswers)
				})
			},
			// sort...
			function(userAnswers,callback){
				userAnswers = _.sortBy(userAnswers,function(userAnswer){
					return userAnswer.answer.creation_date
				}).reverse()
				callback(null,userAnswers)
			}
		],function(err,userAnswers){
			callback(err,userAnswers)
		})






		// console.log('headers are %s',util.inspect(headers))
	},

	getUserQuestions: function(accessToken,callback){


		async.waterfall([
			// get answers
			function(callback){
				var questions = [];
				var page = 1;

				async.whilst(
					function(){
						return page;
					},
					function(callback){
						var qs = {
							site: 'stackoverflow.com',
							key: config.get('stackoverflow.key'),
							access_token: accessToken,
							filter: 'withbody',
							page: page
						}
						request('https://api.stackexchange.com/me/questions',{qs: qs, gzip: true},function(error,response,body){
							if(error){
								callback(error);
							}else if(response.statusCode > 300){
								// console.log('error in getUser')
								callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
							}else{
								var data = JSON.parse(body);
								questions = questions.concat(data.items)
								page = (data.has_more ? page + 1 : false)
								callback(null,questions)
							}
						})

					},
					function(err,questions){
						callback(err,questions)
					}
				);
			},
			// sort...
			function(questions,callback){
				questions = _.sortBy(questions,function(question){
					return question.creation_date
				}).reverse()
				callback(null,questions)
			}
		],function(err,questions){
			callback(err,questions)
		})






		// console.log('headers are %s',util.inspect(headers))
	},

	saveUserAnswerEvents: function(db,user,since,callback){
		var thisObject = this;
		async.waterfall([
			function(callback){
				thisObject.getUserAnswers(user.stackoverflow.access_token,function(err,answers){
					callback(err,answers)
				})
			},
			function(answers,callback){
				async.each(answers,function(answer,callback){
					events.add(db,user._id.toString(),{
						id: answer.answer.answer_id,
						when: moment(Number(answer.answer.creation_date + '000')).toDate(),
						tags: answer.question.tags,
						type: 'SO answer',
						score: answer.answer.score,
						is_accepted: answer.answer.is_accepted
					},function(err,event){
						callback(err)
					})
				},function(err){
					callback(err)
				})

			}
		],function(err){
			callback(err)
		})
	},

	saveUserQuestionEvents: function(db,user,since,callback){
		var thisObject = this;
		async.waterfall([
			function(callback){
				thisObject.getUserQuestions(user.stackoverflow.access_token,function(err,questions){
					callback(err,questions)
				})
			},
			function(questions,callback){
				async.each(questions,function(question,callback){
					events.add(db,user._id.toString(),{
						id: question.question_id,
  					when: moment(Number(question.creation_date + '000')).toDate(),
  					tags: question.tags,
  					type: 'SO question',
						score: question.score
					},function(err,event){
						callback(err)
					})
				},function(err){
					callback(err)
				})

			}
		],function(err){
			callback(err)
		})
	}

}
