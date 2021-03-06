var config = require('config');
var request = require('request');
var _ = require('underscore');
var async = require('async');
var moment = require('moment');
var parseLinkHeader = require('parse-link-header');
var util = require('util');
var atob = require('atob')
// var simpleGit = require('simple-git')()
var fs = require('fs')
var fse = require('fs-extra')
var url = require('url');
var slug = require('slug')
var exec = require('child_process').exec;
var languageDetect = require('language-detect');

var events = require('../models/events')

module.exports = {
	getAPIHeaders: function(accessToken){
		return {
			Authorization: 'token ' + accessToken,
			Accept: 'application/vnd.github.v3+json',
			'User-Agent': config.get('app.name')
		};
	},
	getUser: function(accessToken,callback){
		var headers = this.getAPIHeaders(accessToken);
		// console.log('headers are %s',util.inspect(headers))
		request('https://api.github.com/user',{headers: headers},function(error,response,body){
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
	getUserRepos: function(accessToken,callback){
		var headers = this.getAPIHeaders(accessToken);
		var repos = [];
		var page = 1;
		var linkHeader;

		async.whilst(
			function(){
				return page;
			},
			function(callback){
				var qs = {
					page: page,
					// type: 'owner'
				}
				request('https://api.github.com/user/repos',{headers: headers, qs: qs},function(error,response,body){
					if(error){
						callback(error);
					}else if(response.statusCode > 300){
						callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
					}else{
						var data = JSON.parse(body)
						repos = repos.concat(data);
						linkHeader = parseLinkHeader(response.headers.link);
						page = (linkHeader? ('next' in linkHeader ? linkHeader.next.page : false) : false);
						callback(null,repos);
					}
				});
			},
			function(err,repos){
				callback(err,repos)
			}
		);

	},
	getUserReposWithCommits: function(accessToken,callback){
		var thisObject = this;
		var headers = this.getAPIHeaders(accessToken);

		async.waterfall([
			function(callback){
				thisObject.getUser(accessToken,function(err,user){
					callback(err,user)
				})
			},
			function(user,callback){
				thisObject.getUserRepos(accessToken,function(err,repos){
					callback(err,user,repos)
				})
			},
			function(user,repos,callback){
				var reposWithCommits = [];
				var qs = {
					author: user.login
				}
				async.each(repos,function(repo,callback){
					var url = util.format('https://api.github.com/repos/%s/commits',repo.full_name)
					request('https://api.github.com/user/repos',{headers: headers, qs: qs},function(error,response,body){
						if(error){
							callback(error);
						}else if(response.statusCode > 300){
							callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
						}else{
							var data = JSON.parse(body)
							if(data.length > 0){
								reposWithCommits.push(repo)
							}
							callback()
						}
					});
				},function(err){
					callback(err,reposWithCommits)
				})
			}
		],function(err,reposWithCommits){
			callback(err,reposWithCommits)
		})
	},
	getReposCounts: function(accessToken,callback){
		this.getUserRepos(accessToken,function(err,repos){
			if(err){
				callback(err)
			}else{

				var counts = _.reduce(repos,function(memo,repo){
					console.log('%s %s %s',repo.full_name,repo.stargazers_count,repo.watchers_count)
					return {
						stars: memo.stars + repo.stargazers_count,
						watchers: memo.watchers + repo.watchers_count
					}
				},{
					stars: 0, watchers: 0
				})

				callback(null,counts)
			}
		})
	},
	getRepoLanguages: function(accessToken,repo,callback){
		var headers = this.getAPIHeaders(accessToken);
		request('https://api.github.com/repos/' + repo.full_name + '/languages',{headers: headers},function(error,response,body){
			if(error){
				callback(error);
			}else if(response.statusCode > 300){
				console.log('err in lamnguages for %s',repo.full_name);
				callback(null,[])
				// callback('error in get repo languages ' + response.statusCode + ':' + body);
			}else{
				callback(null,_.keys(JSON.parse(body)));
			}
		})
	},
	getLanguagesTagCloud: function(accessToken,callback){
		var thisObject = this;
		async.waterfall([
			// get repos
			function(callback){
				thisObject.getUserRepos(accessToken,function(err,repos){
					callback(err,repos)
				})
			},
			// for each repo, get languages
			function(repos,callback){
				var languages = [];
				async.each(repos,function(repo,callback){
					thisObject.getRepoLanguages(accessToken,repo,function(err,repoLanguages){
						if(err){
							callback(err)
						}else{
							languages = languages.concat(repoLanguages)
							callback()
						}
					})
				},function(err){
					callback(err,languages)
				})
			},
			function(languages,callback){

				languages = languages.sort()

				tagCloud = _.countBy(languages,function(language){
			    return language;
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
		],function(err,tagCloud){
			callback(err,tagCloud)
		})
	},
	getLanguagesTagCloudFromReposWithCommits: function(accessToken,callback){
		var thisObject = this;
		async.waterfall([
			// get repos
			function(callback){
				thisObject.getUserReposWithCommits(accessToken,function(err,repos){
					callback(err,repos)
				})
			},
			// for each repo, get languages
			function(repos,callback){
				var languages = [];
				async.each(repos,function(repo,callback){
					thisObject.getRepoLanguages(accessToken,repo,function(err,repoLanguages){
						if(err){
							callback(err)
						}else{
							languages = languages.concat(repoLanguages)
							callback()
						}
					})
				},function(err){
					callback(err,languages)
				})
			},
			function(languages,callback){

				languages = languages.sort()

				tagCloud = _.countBy(languages,function(language){
					return language;
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
		],function(err,tagCloud){
			callback(err,tagCloud)
		})
	},
	getUserCommitsWithLanguageTag: function(accessToken,since,callback){
		var thisObject = this;
		var headers = this.getAPIHeaders(accessToken);

		async.waterfall([
			function(callback){
				thisObject.getUser(accessToken,function(err,user){
console.log('got user: %s',util.inspect(user))
					callback(err,user)
				})
			},
			function(user,callback){
				thisObject.getUserRepos(accessToken,function(err,repos){
console.log('got repos: %s',repos.length)
					callback(err,user,repos)
				})
			},
			function(user,repos,callback){
				var commits = [];

				async.each(repos,function(repo,callback){

					async.parallel([
						function(callback){

							// thisObject.getRepoAuthorCommits(accessToken,repo,user.login,function(err,repoCommits){
							thisObject.getRepoAuthorCommitsWithLanguages(accessToken,repo,user.login,since,function(err,repoCommits){
								callback(err,repoCommits)
							})
						},
						function(callback){
							thisObject.getRepoLanguages(accessToken,repo,function(err,repoLanguages){
								callback(err,repoLanguages)
							})
						},
					],function(err,results){

						if(err){
							callback(err)
						}else{
console.log('got %s commits for repo %s with languages %s',results[0].length,repo.full_name,util.inspect(results[1]))
							commits = commits.concat(_.map(results[0],function(commit){
								commit['repo_languages'] = results[1];
								return commit;
								// return {
								// 	id: commit.sha,
								// 	when: commit.commit.author.date,
								// 	tags: results[1]
								// };
							}))
							callback()
						}
					})
				},function(err){
					callback(err,commits)
				})
			}
		],function(err,commits){
			callback(err,commits)
		})
	},

	getRepoAuthorCommits: function(accessToken,repo,author,callback){
		var headers = this.getAPIHeaders(accessToken);
		var commits = [];
		var page = 1;
		var linkHeader;
		var url = util.format('https://api.github.com/repos/%s/commits',repo.full_name)

		async.whilst(
			function(){
				return page;
			},
			function(callback){
				var qs = {
					author: author,
					page: page
				}

				request(url,{headers: headers, qs: qs},function(error,response,body){
					if(error){
						callback(error);
					}else if(response.statusCode > 300){
console.log('err in repo %s: %s: %s',repo.full_name,response.statusCode,body)
						// callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
						page = false;
						callback(null,commits)
					}else{
						var data = JSON.parse(body)
						commits = commits.concat(data);
						linkHeader = parseLinkHeader(response.headers.link);
						page = (linkHeader? ('next' in linkHeader ? linkHeader.next.page : false) : false);
						callback(null,commits);
					}
				});
			},
			function(err,commits){
				callback(err,commits)
			}
		);

	},

	getRepoAuthorCommitsWithLanguages: function(accessToken,repo,author,since,callback){
		var headers = this.getAPIHeaders(accessToken);
		var commits = [];
		var page = 1;
		var linkHeader;
		var url = util.format('https://api.github.com/repos/%s/commits',repo.full_name)

		async.waterfall([
			// get all commits
			function(callback){
				async.whilst(
					function(){
						return page;
					},
					function(callback){
						var qs = {
							author: author,
							page: page
						}
						if(since){
							qs.since = since;
						}

						request(url,{headers: headers, qs: qs},function(error,response,body){
							if(error){
								callback(error);
							}else if(response.statusCode > 300){
		console.log('err in repo %s: %s: %s',repo.full_name,response.statusCode,body)
								// callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
								if(response.headers['x-ratelimit-remaining'] == '0'){
									callback(body)
								}else{
									page = false;
									callback(null,commits)
								}
							}else{
								var data = JSON.parse(body)
								commits = commits.concat(data);
								linkHeader = parseLinkHeader(response.headers.link);
								page = (linkHeader? ('next' in linkHeader ? linkHeader.next.page : false) : false);
								callback(null,commits);
							}
						});
					},
					function(err,commits){
						callback(err,commits)
					}
				);
			},
			// per each commit, get languages
			function(commits,callback){
				var commitsWithLanguages = [];
				async.eachLimit(commits,1,function(commit,callback){
					var url = util.format('https://api.github.com/repos/%s/commits/%s',repo.full_name,commit.sha)
					request(url,{headers: headers},function(error,response,body){
						if(error){
							callback(error);
						}else if(response.statusCode > 300){
							callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
						}else{
							var data = JSON.parse(body);
							var languages = [];
							var language;
							_.each(data.files,function(file){
								language = languageDetect.filename(file.filename);
								if(typeof language != 'undefined'){
									languages.push(language)
								}
							})
							languages = _.uniq(languages)
console.log('detected languages for commit %s: %s',commit.sha,util.inspect(languages))
							commit.languages = languages;
							commitsWithLanguages.push(commit)
							callback()
						}
					})
				},function(err){
					callback(err,commitsWithLanguages)
				})
			}
		],function(err,commits){
			callback(err,commits)
		})




	},
	getCommitLanguages: function(accessToken,repo,commit,callback){
		var headers = this.getAPIHeaders(accessToken);
		var url = util.format('https://api.github.com/repos/%s/commits/%s',repo.full_name,commit.sha)
		request(url,{headers: headers},function(error,response,body){
			if(error){
				callback(error);
			}else if(response.statusCode > 300){
				if(response.headers['x-ratelimit-remaining'] == '0'){
					callback('ratelimit');
				}else{
					callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
				}
			}else{
				var data = JSON.parse(body);
				var languages = [];
				var language;
				_.each(data.files,function(file){
					language = languageDetect.filename(file.filename);
					if(typeof language != 'undefined'){
						languages.push(language)
					}
				})
				languages = _.uniq(languages)
				callback(null,languages)
			}
		})
	},
	saveCommitEvent: function(db,user,commit,callback){
		events.add(db,user._id.toString(),{
			id: commit.sha,
			when: moment(commit.commit.author.date).toDate(),
			tags: commit.languages,
			type: 'GH commit'
		},function(err,event){
			callback(err,event)
		})
	},
	saveUserCommitEvents: function(db,user,since,callback){
		var thisObject = this;
		var headers = this.getAPIHeaders(user.github.access_token);

		async.waterfall([
			function(callback){
				thisObject.getUserRepos(user.github.access_token,function(err,repos){
					callback(err,repos)
				})
			},
			function(repos,callback){
console.log('got %s repos',repos.length)
				var commits = [];

				async.eachLimit(repos,1,function(repo,callback){

					thisObject.getRepoAuthorCommitsWithLanguages(user.github.access_token,repo,user.github.username,since,function(err,repoCommits){
						if(err){
							callback(err)
						}else{
							commits = commits.concat(repoCommits)
							callback()
						}
					})
				},function(err){
					callback(err,commits)
				})
			},
			function(commits,callback){
				async.each(commits,function(commit,callback){
					thisObject.saveCommitEvent(db,user,commit,function(err){
						if(err){
							callback(err)
						}else{
							callback()
						}
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
