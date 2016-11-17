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
					type: 'owner'
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
				callback('error in get repo languages ' + response.statusCode + ':' + body);
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
				tagCloud = _.countBy(languages,function(language){
			    return language;
			  })
				callback(null,tagCloud)
			}
		],function(err,tagCloud){
			callback(err,tagCloud)
		})
	}


}
