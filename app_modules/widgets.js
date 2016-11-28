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

        tags = tags.sort();

  			tagCloud = _.countBy(tags,function(tag){
  				return tag;
  			})

        var values = _.values(tagCloud);
        var min = _.min(values);
        var max = _.max(values);

  			callback(null,{
          cloud: tagCloud,
          min: min,
          max: max
        })
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

        var values = _.values(tagCloud);
        var min = _.min(values);
        var max = _.max(values);

  			callback(null,{
          cloud: tagCloud,
          min: min,
          max: max
        })
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
  },
  meetupGroupCategoriesTagCloud: function(accessToken,callback){
    async.parallel([
      function(callback){
        meetup.getUserGroups(accessToken,function(err,meetupGroups){
          callback(err,meetupGroups)
        })
      },
    ],function(err,results){
      if(err){
        callback(err)
      }else{
        var tags = [];
        _.each(results[0],function(meetupGroup){
          tags.push(meetupGroup.category.name)
        })

        var tagCloud = _.countBy(tags,function(tag){
          return tag;
        })

        var values = _.values(tagCloud);
        var min = _.min(values);
        var max = _.max(values);

  			callback(null,{
          cloud: tagCloud,
          min: min,
          max: max
        })
      }
    })
  },
  linkedinSummary: function(accessToken,callback){
    async.parallel([
  		function(callback){
  			linkedin.getUser(accessToken,function(err,linkedinUser){
  				callback(err,linkedinUser)
  			})
  		},
  	],function(err,results){
  		callback(err,results[0])
  	})
  },
  githubProfileLink: function(accessToken,callback){
    async.parallel([
  		function(callback){
  			github.getUser(accessToken,function(err,githubUser){
  				callback(err,githubUser.html_url)
  			})
  		},
  	],function(err,results){
  		callback(err,results[0])
  	})
  },
}
