var config = require('config');
var request = require('request');
var _ = require('underscore');
var async = require('async');
var parseLinkHeader = require('parse-link-header');
var util = require('util');

var github = require('../app_modules/github');
var stackoverflow = require('../app_modules/stackoverflow');
var linkedin = require('../app_modules/linkedin');
var meetup = require('../app_modules/meetup');

module.exports = {
  githubBasicStats: function(accessToken,callback){
  	async.parallel([
  		function(callback){
  			github.getUser(accessToken,function(err,githubUser){
  				callback(err,githubUser)
  			})
  		},
  		function(callback){
  			github.getReposCounts(accessToken,function(err,githubReposCounts){
  				callback(err,githubReposCounts)
  			})
  		},
  	],function(err,results){
  		if(err){
  			callback(err)
  		}else{
        callback(null,{
          followers: results[0].followers,
          following: results[0].following,
          public_repos: results[0].public_repos,
          public_gists: results[0].public_gists,
          total_stars: results[1].stars,
          total_watchers: results[1].watchers
        })
  		}
  	})
  },
  githubReposTagCloud: function(acccessToken,callback){
    async.parallel([
      function(callback){
        github.getLanguagesTagCloud(acccessToken,function(err,githubLanguagesTagCloud){
          callback(err,githubLanguagesTagCloud)
        })
      },
    ],function(err,results){
      callback(err,results[0])
    })
  },
  stackoverflowBasicStats: function(accessToken,callback){
    async.parallel([
  		function(callback){
  			stackoverflow.getUser(accessToken,function(err,stackoverflowUser){
  				callback(err,stackoverflowUser)
  			})
  		},
  	],function(err,results){
  		if(err){
  			callback(err)
  		}else{
        callback(null,{
          reputation: results[0].items[0].reputation,
          badges:{
            gold: results[0].items[0].badge_counts.gold,
            silver: results[0].items[0].badge_counts.silver,
            bronze: results[0].items[0].badge_counts.bronze
          }
        })
  		}
  	})
  },
  stackoverflowQuestionsTagCloud: function(accessToken,callback){
    async.parallel([
  		function(callback){
  			stackoverflow.getUserQuestions(accessToken,function(err,stackoverflowQuestions){
  				callback(err,stackoverflowQuestions)
  			})
  		},
  	],function(err,results){
  		if(err){
  			callback(err)
  		}else{

  			var tags = [];
  			_.each(results[0],function(stackoverflowQuestion){
  				tags = tags.concat(stackoverflowQuestion.tags)
  			})

  			tagCloud = _.countBy(tags,function(tag){
  				return tag;
  			})

  			callback(null,tagCloud)
  		}
  	})
  },
  stackoverflowAnswersTagCloud: function(accessToken,callback){
    async.parallel([
  		function(callback){
  			stackoverflow.getUserAnswers(accessToken,function(err,stackoverflowAnswers){
  				callback(err,stackoverflowAnswers)
  			})
  		},
  	],function(err,results){
  		if(err){
  			callback(err)
  		}else{
  			var tags = [];
  			_.each(results[0],function(stackoverflowAnswer){
  				tags = tags.concat(stackoverflowAnswer.question.tags)
  			})

  			tagCloud = _.countBy(tags,function(tag){
  				return tag;
  			})

  			callback(null,tagCloud)
  		}
  	})
  },
  meetupGroups: function(accessToken,callback){
    async.parallel([
  		function(callback){
  			meetup.getUserGroups(accessToken,function(err,meetupGroups){
  				callback(err,meetupGroups)
  			})
  		},
  	],function(err,results){
  		callback(err,results[0])
  	})
  }
}
