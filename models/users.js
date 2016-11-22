var util = require('util')

module.exports = {
  addGitHub: function(db,userID,github,callback){
    var users = db.get('users');
    users.findOneAndUpdate({
      _id: userID
    },{
      $set: {
        github: github
      }
    },{
      new: true
    },function(err,user){
      callback(err,user)
    })
  },
  addLinkedIn: function(db,userID,accessToken,callback){
    var users = db.get('users');
    users.findOneAndUpdate({
      _id: userID
    },{
      $set: {
        linkedin: {
          access_token: accessToken
        }
      }
    },{
      new: true
    },function(err,user){
      callback(err,user)
    })
  },
  addStackOverflow: function(db,userID,accessToken,callback){
    var users = db.get('users');
    users.findOneAndUpdate({
      _id: userID
    },{
      $set: {
        stackoverflow: {
          access_token: accessToken
        }
      }
    },{
      new: true
    },function(err,user){
      callback(err,user)
    })
  },
  addMeetup: function(db,userID,refreshToken,callback){
    var users = db.get('users');
    users.findOneAndUpdate({
      _id: userID
    },{
      $set: {
        meetup: {
          refresh_token: refreshToken
        }
      }
    },{
      new: true
    },function(err,user){
      callback(err,user)
    })
  },
  saveWidgets: function(db,userID,widgets,callback){
    var users = db.get('users');
    users.findOneAndUpdate({
      _id: userID
    },{
      $set: {
        widgets: widgets
      }
    },{
      new: true
    },function(err,user){
      callback(err,user)
    })
  },
  getByPlatformAndID: function(db,platform,id,callback){
    var users = db.get('users');
    var search = {};
    search[platform + '.username'] = id;
    console.log('search is %s',util.inspect(search))

    users.findOne(search,function(err,user){
      callback(err,user)
    })

  }



}
