var mongodb = require('./db');
var postdb = require('./post');
function Comment(name,time,title,comment) {
    this.name = name,
    this.time = time,
    this.title = title,
    this.commentarr = comment
}

module.exports = Comment;

Comment.prototype.save = function (callback,affected) {
    postdb.update({username:this.name,title:this.title,time:this.time},{   $push:{comment:this.commentarr} },function (err,numAffected) {
        if (err){
            return callback(err);
        }
        callback(null,numAffected);
    })
}

Comment.prototype.show = function(callback){
    console.log(this.name+this.time+this.title+this.commentarr)    ;
}
