var config = require('config');
var request = require('request');
var _ = require('underscore');
var async = require('async');
var parseLinkHeader = require('parse-link-header');
var util = require('util');
var moment = require('moment')
var twix = require('twix')

var github = require('../app_modules/github');
var stackoverflow = require('../app_modules/stackoverflow');
var linkedin = require('../app_modules/linkedin');
var meetup = require('../app_modules/meetup');

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

        // github.getLanguagesTagCloud(acccessToken,function(err,githubLanguagesTagCloud){
        github.getLanguagesTagCloudFromReposWithCommits(acccessToken,function(err,githubLanguagesTagCloud){
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
  meetupGroups: function(accessToken,callback){
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
        callback(err,results[0])
      }
  	})
  },
  meetupRsvps: function(refreshToken,callback){
    async.parallel([
  		function(callback){
  			meetup.getUserRsvps(refreshToken,function(err,rsvps){
  				callback(err,rsvps)
  			})
  		},
  	],function(err,results){
      if(err){
        callback(err)
      }else{
        callback(err,results[0])
      }
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

        tags = tags.sort();

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
  linkedinProfileLink: function(accessToken,callback){
    async.parallel([
  		function(callback){
  			linkedin.getUser(accessToken,function(err,linkedinUser){
  				callback(err,linkedinUser.publicProfileUrl)
  			})
  		},
  	],function(err,results){
  		callback(err,results[0])
  	})
  },
  stackoverflowProfileLink: function(accessToken,callback){
    async.parallel([
  		function(callback){
  			stackoverflow.getUser(accessToken,function(err,stackoverflowUser){
  				callback(err,stackoverflowUser)
  			})
  		},
  	],function(err,results){
  		callback(err,results[0].items[0].link)
  	})
  },
  meetupProfileLink: function(refreshToken,callback){
    async.parallel([
  		function(callback){
  			meetup.getUser(refreshToken,function(err,meetupUser){
  				callback(err,meetupUser)
  			})
  		},
  	],function(err,results){
      if(err){
        callback(err)
      }else{
        callback(err,results[0].link)
      }
  	})
  },
  bigTagCloudOld: function(githubAccessToken,stackOverflowAccessToken,db,callback){
    async.parallel([
  		function(callback){
  			github.getUserCommitsWithLanguageTag(githubAccessToken,function(err,commits){
  				callback(err,commits)
  			})
  		},
  		function(callback){
  			stackoverflow.getUserQuestions(stackOverflowAccessToken,function(err,questions){
  // console.log('sample question: %s',util.inspect(questions[0]))
  				callback(err,questions)
  			})
  		},
  		function(callback){
  			stackoverflow.getUserAnswers(stackOverflowAccessToken,function(err,answers){
  // console.log('sample answers: %s',util.inspect(answers[0]))
  				callback(err,answers)
  			})
  		},
  	],function(err,results){
  		if(err){
  			callback(err)
  		}else{


console.log('results are: %s',util.inspect(results,{depth:8}))

  			var events = [];
  			events = events.concat(_.map(results[0],function(commit){
  				return {
  					id: commit.sha,
  					when: moment(commit.commit.author.date).toDate(),
  					// tags: commit.repo_languages,
            tags: commit.languages,
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

        var col = db.get('events');
        _.each(events,function(event){
          col.insert(event)
        })

        // create a sortable list of tags
        // var tags = [];
        // _.each(events,function(event){
        //   _.each(event.tags,function(tag){
        //     tags.push(tag)
        //   })
        // })
        //
        // tags = _.uniq(tags);
        // tags = _.sortBy(tags,function(tag){
        //   return tag.toLowerCase()
        // })
        //
        // var tagCloud = _.countBy(tags,function(tag){
  			// 	return tag;
  			// })
        //
        // tagCloud = _.mapObject(tagCloud,function(val,key){
        //   return 0;
        // })
        //
  			// _.each(events,function(event){
  			// 	_.each(event.tags,function(tag){
  			// 		tagCloud[tag] += getEventScore(event)
  			// 	})
  			// })
        //
  			// // console.log('tagCloud is %s',util.inspect(tagCloud))
        //
        // var values = _.values(tagCloud);
        // var min = _.min(values);
        // var max = _.max(values);
        //
        // var invertedCloud = _.invert(tagCloud);
        // var keys = _.keys(invertedCloud).sort(function(a,b){return Number(a) - Number(b)}).reverse();
        // console.log('keys is %s',util.inspect(keys))
        // var big5 = _.first(keys,5)
        // var big5Tags = [];
        // _.each(big5,function(val){
        //   big5Tags.push(invertedCloud[val])
        // })
        //
        // console.log('big 5 are: %s',util.inspect(big5Tags))
        //
        // // sort the events list according to date
  			// events = _.sortBy(events,'when');
        //
  			// // find min and max dates
  			// var earliestEvent = _.min(events,function(event){
  			// 	return event.when;
  			// })
        //
  			// var latestEvent = _.max(events,function(event){
  			// 	return event.when;
  			// })
        //
  			// // generate initial x and y
  			// var x = [];
  			// var itr = moment.twix(new Date(earliestEvent.when),new Date(latestEvent.when)).iterate("months");
  			// while(itr.hasNext()){
  			// 	currentDate = itr.next().format('YYYY-MM');
  			// 	x.push(currentDate);
  			// }
        //
        // x = x.reverse();
        //
  			// // flatten all the dates
  			// events = _.map(events,function(event){
  			// 	event.when = moment(event.when).format('YYYY-MM');
  			// 	return event;
  			// })
        //
        // var traces = [];
        //
        // // create a score graph for each of the big 5 tags
        // _.each(big5Tags,function(big5Tag){
        //   var y = [];
        //   _.each(x,function(x1){
        //     var value = 0;
        //     var relevantEvents = _.filter(events,function(event){
        //       return (_.contains(event.tags,big5Tag) && event.when == x1);
        //     })
        //     value = _.reduce(relevantEvents,function(memo,event){
        //       return memo + getEventScore(event)
        //     },0)
        //     y.push(value);
        //   })
        //   traces.push({
        //     name: big5Tag,
        //     // line: {
        //     //   shape: 'spline'
        //     // },
        //     type: 'scatter',
        //     x: x,
        //     y: y
        //   })
        // })
        //
        // console.log('trends is %s',util.inspect(traces,{depth:8}))
        //
        //
        //
  			// callback(null,{
        //   cloud: tagCloud,
        //   min: min,
        //   max: max,
        //   trends: traces
        // })


  		}
  	})
  },
  bigTagCloud: function(userID,githubAccessToken,stackOverflowAccessToken,db,callback){
    var events = db.get('events');
    events.find({user_id: userID},function(err,events){
      if(err){
        callback(err)
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

        // res.json({
        //   trends: traces
        // })

        callback(null,{
          trends: traces,
          cloud: tagCloud,
          min: min,
          max: max
        })


      }
    })
  }
}
