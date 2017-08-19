/**
 * Created by leo on 2017/7/28.
 */
var mongoose = require('mongoose');


mongoose.connection.on('connected',function () {
    console.log("Mongoose connection open to localhost");
});

mongoose.connection.on('error',function (err) {
    console.log('Mongoose connection error: ' + err);
});

mongoose.connection.on('disconnected', function () {
    console.log('Mongoose connection disconnected');
});

module.exports = mongoose;
