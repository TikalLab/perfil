module.exports = {
  addGitHub: function(db,userID,accessToken,callback){
    var users = db.get('users');
    users.findOneAndUpdate({
      _id: userID
    },{
      $set: {
        github: {
          access_token: accessToken
        }
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
        stackoverlow: {
          access_token: accessToken
        }
      }
    },{
      new: true
    },function(err,user){
      callback(err,user)
    })
  }

}
