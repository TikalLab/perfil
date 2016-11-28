var math = require('mathjs')

module.exports = {
  getSizeClass: function(min,max,val){
    var pips = (max - min) / 8;
    var idx = math.round((val - min) / pips + min);

  }
}
