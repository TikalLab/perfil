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
  }
}
