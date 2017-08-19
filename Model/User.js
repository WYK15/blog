/**
 * Created by leo on 2017/7/28.
 */
var mongoos = require('./db');
var schema = mongoos.Schema;
var crypto = require('crypto');

function User(user) {
    this.name = user.username;
    this.password = user.password;
    this.email = user.mail;
}
module.exports = User;
var con1 = mongoos.createConnection("mongodb://localhost/users");
var UserSchema = new schema({
    username:{type:String},
    password:{type:String},
    mail:{type:String}
});
var user = con1.model('user',UserSchema);

User.prototype.save = function (callback) {
    //callback(error,data)
    var auser = new user({
        username:this.name,
        password:this.password,
        mail:this.email,

    });
    auser.save(function (err) {
        if (err){
            return callback(err);
        }
        callback(null,auser);
    });
}

User.get = function (name,callback) {
    user.find({'username':name},function (err,doc) {
        if (err){
            return callback(err);
        }else
            return callback(null,doc);
    });
}
