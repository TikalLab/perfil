var config = require('config')
var mongo = require('mongodb');
var monk = require('monk');
var db = monk(config.get('mongo.uri'));
var async = require('async')

var util = require('util')
var github = require('./app_modules/github')


var users = db.get('users');
users.findOne({_id: process.argv[2]},function(err,user){
  if(err){
    console.log('err is %s',err)
  }else{
    console.log('got the following user: %s',util.inspect(user))
    github.saveUserCommitEvents(db,user,null,function(err){
      if(err){
        console.log('err is: %s',err)
      }else{
        console.log('finsihed successfuly')
      }
    })
  }
})
// users.find({},function(err,users){
//   if(err){
//     console.log('err is %s',err)
//   }else{
//     console.log('got the following users: %s',util.inspect(users))
//     async.each(users,function(user,callback){
//       github.saveUserCommitEvents(db,user,null,function(err){
//         if(err){
//           // ignore errs mo haha
//           // callback(err)
//           callback()
//         }else{
//           callback()
//         }
//       })
//     },function(err){
//       if(err){
//         console.log('err is %s',err)
//       }
//     })
//   }
// })
