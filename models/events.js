var util = require('util')

module.exports = {
  add: function(db,userID,event,callback){
    event.user_id = userID;
    var events = db.get('events');
    events.insert(event,function(err,event){
      callback(err,event)
    })
  },
}
