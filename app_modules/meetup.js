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
	refreshToken: function(refreshToken,callback){

		// console.log('headers are %s',util.inspect(headers))
		var form = {
			client_id: config.get('meetup.client_id'),
			client_secret: config.get('meetup.client_secret'),
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		}
		request.post('https://secure.meetup.com/oauth2/access',{form: form},function(error,response,body){
			if(error){
				callback(error);
			}else if(response.statusCode > 300){
				// console.log('error in getUser')
				callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
			}else{
				var data = JSON.parse(body);
				callback(null,data.access_token)
			}
		})
	},
	getUser: function(refreshToken,callback){
		var thisObject = this;
		async.waterfall([
			function(callback){
				thisObject.refreshToken(refreshToken,function(err,accessToken){
					callback(err,accessToken)
				})
			},
			function(accessToken,callback){
				var headers = {
					Authorization: util.format('Bearer %s',accessToken)
				}
				request('https://api.meetup.com/2/member/self',{headers: headers},function(error,response,body){
					if(error){
						callback(error);
					}else if(response.statusCode > 300){
						callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
					}else{
						var data = JSON.parse(body)
						callback(null,data);
					}
				});
			},
		],function(err,user){
			callback(err,user)
		})
	},
	getUserGroups: function(refreshToken,callback){
		var thisObject = this;
		async.waterfall([
			function(callback){
				thisObject.refreshToken(refreshToken,function(err,accessToken){
					callback(err,accessToken)
				})
			},
			function(accessToken,callback){
				var groups = [];
				var offset = 0;
				var linkHeader;

				var headers = {
					Authorization: util.format('Bearer %s',accessToken)
				}

				async.whilst(
					function(){
						return offset !== false;
					},
					function(callback){
						var qs = {
							page: 20,
							offset: offset
						}
						request('https://api.meetup.com/self/groups',{headers: headers, qs: qs},function(error,response,body){
							if(error){
								callback(error);
							}else if(response.statusCode > 300){
								callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
							}else{
								var data = JSON.parse(body)
console.log('meetup res: %s',util.inspect(data))
								groups = groups.concat(data);
								linkHeader = parseLinkHeader(response.headers.link);
								offset = (linkHeader? ('next' in linkHeader ? linkHeader.next.offset : false) : false);
								callback(null,groups);
							}
						});
					},
					function(err,groups){
						callback(err,groups)
					}
				);

			}
		],function(err,groups){
			callback(err,groups)
		})
	},
	getGroupEvents: function(accessToken,group,callback){
		var events = [];
		var offset = 0;
		var linkHeader;

		var headers = {
			Authorization: util.format('Bearer %s',accessToken)
		}

		async.whilst(
			function(){
				return offset !== false;
			},
			function(callback){
				var qs = {
					page: 20,
					offset: offset
				}
				var url = util.format('https://api.meetup.com/%s/events',group.urlname)
				request(url,{headers: headers, qs: qs},function(error,response,body){
					if(error){
						callback(error);
					}else if(response.statusCode > 300){
						callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
					}else{
						var data = JSON.parse(body)
console.log('meetup res: %s',util.inspect(data))
						events = events.concat(data);
						linkHeader = parseLinkHeader(response.headers.link);
						offset = (linkHeader? ('next' in linkHeader ? linkHeader.next.offset : false) : false);
						callback(null,events);
					}
				});
			},
			function(err,events){
				callback(err,events)
			}
		);

	},
	getEventRsvps: function(accessToken,event,callback){
		var rsvps = [];
		var offset = 0;
		var linkHeader;

		var headers = {
			Authorization: util.format('Bearer %s',accessToken)
		}

		async.whilst(
			function(){
				return offset !== false;
			},
			function(callback){
				var qs = {
					page: 20,
					offset: offset,
					event_id: event,
					rsvp: 'yes'
				}
				request('https://api.meetup.com/2/rsvps',{headers: headers, qs: qs},function(error,response,body){
					if(error){
						callback(error);
					}else if(response.statusCode > 300){
						callback(response.statusCode + ' : ' + arguments.callee.toString() + ' : ' + body);
					}else{
						var data = JSON.parse(body)
console.log('meetup res: %s',util.inspect(data))
						rsvps = rsvps.concat(data);
						linkHeader = parseLinkHeader(response.headers.link);
						offset = (linkHeader? ('next' in linkHeader ? linkHeader.next.offset : false) : false);
						callback(null,rsvps);
					}
				});
			},
			function(err,rsvps){
				callback(err,rsvps)
			}
		);

	}
	getUserRsvps: function(refreshToken,callback){
		var thisObject = this;
		async.waterfall([
			function(callback){
				thisObject.getUser(refreshToken,function(err,meetupUser){
					callback(err,meetupUser)
				})
			},
			function(meetupUser,callback){
				thisObject.getUserGroups(refreshToken,function(err,groups){
					callback(err,meetupUser,groups)
				})
			},
			function(meetupUser,groups,callback){
				thisObject.refreshToken(refreshToken,function(err,accessToken){
					callback(err,meetupUser,groups,accessToken)
				})
			},
			function(meetupUser,groups,accessToken,meetupUser,callback){
				var allEvents = [];
				async.each(groups,function(group,callback){
					thisObject.getGroupEvents(accessToken,group,function(err,events){
						if(err){
							callback(err)
						}else{
							allEvents = allEvents.concat(events)
							callback()
						}
					})
				},function(err){
					callback(err,meetupUser,accessToken,allEvents)
				})
			},
			// per event, get if the user was rsvp
			function(meetupUser,accessToken,allEvents,callback){
				var userRsvps = [];
				async.each(allEvents,function(event,callback){
					thisObject.getEventRsvps(accessToken,event,function(err,rsvps){
						if(err){
							callback(err)
						}else{
							var isRsvped = _.find(rsvps,function(rsvp){
								return rsvp.member.member_id == meetupUser.id;
							})
							if(isRsvped){
								userRsvps.push(event)
							}
							callback()
						}
					})
				},function(err){
					callback(err,userRsvps)
				})
			}
		],function(err,userRsvps){
			callback(err,userRsvps)
		});
	}


}
