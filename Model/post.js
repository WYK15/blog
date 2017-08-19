var mongoose = require('./db');
var markdown = require('markdown').markdown;
var Schema = mongoose.Schema;

function Post(post) {
    this.username=post.username,
    this.time=post.time,
    this.title=post.title,
    this.postcontent=post.postcontent,
    this.tags = post.tags
}

module.exports=Post;
var con2 = mongoose.createConnection("mongodb://localhost/post")
var postschema = new Schema({
    username : {type:String},
    time:{type:String},
    title:{type:String},
    tags:{type:Array},
    postcontent:{type:String},
    comment:{type:Array},
    pv:{type:Number},
    reprint_info:{type:Schema.Types.Mixed}
});

var postmodel = con2.model('postmodel',postschema);


//save方法
Post.prototype.save = function (callback) {
    var newpost = new postmodel({
        username:this.username,
        time:this.time,
        title:this.title,
        postcontent:this.postcontent,
        tags:this.tags,
        pv : 0,
        reprint_info:{ }
    });
    newpost.save(function (err) {
        if (err){
        return    callback(err);
        }
        callback(null,newpost);
    });
}

Post.get = function (astitle,callback) {
    postmodel.find(astitle,null,{sort:{time:-1}},function (err,doc) {
        if (err || doc.length==0){
            return callback(err);
        }
        if (doc.length==1){
            doc.pv = doc.pv + 1;
        }
        if (doc.length){
            doc.forEach(function (thedoc) {
                thedoc.postcontent = markdown.toHTML(thedoc.postcontent);
            });
            return callback(null,doc);
        }
    });
}


Post.delete = function (astitle,callback) {
    postmodel.find({username: astitle.username, title: astitle.title, time: astitle.time}, function (err, doc) {
        if (err) {
            return callback(err);
        }
        // console.log(doc[0].reprint_info.reprint_from);
        var reprint_from = "";
        if (doc[0].reprint_info != undefined && doc[0].reprint_info.reprint_from) {
            reprint_from = doc[0].reprint_info.reprint_from;
        }
        if (reprint_from != "") {
            postmodel.update({username: reprint_from.username, time: reprint_from.time, title: reprint_from.title},
                {
                    $pull: {
                        "reprint_info.reprint_to": {
                            "username": astitle.username,
                            "time": astitle.time,
                            "title": astitle.title
                        }
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    postmodel.remove({
                        username: astitle.username,
                        time: astitle.time,
                        title: astitle.title
                    }, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    })
                })
        }
    });
}
Post.update = function (astitle,aschange,callback) {
    postmodel.update(astitle,aschange,{multi:false},function (err) {
       if (err){
           return callback(err);
       }
       callback(null);
    });
}

Post.getten = function (name,page,callback) {
    if (name){
        var condition = {username:name};
    }else{
        var condition = {};
    }
    postmodel.find(condition,null,{skip:(page-1)*5,limit:5},function (err,posts) {
        if (err){
            return callback(err);
        }
         callback(null,posts);
    })
}

Post.count = function (criteria,callback) {
    postmodel.count(criteria,function (err,count) {
        if (err){
           return  callback(err);
        }
        callback(null,count);
    });
}

Post.archive = function (callback) {
    postmodel.find({},null,{sort:{time:-1}},function (err,doc) {
        if (err || doc.length==0){
            return callback(err);
        }
        if (doc.length){
            return callback(null,doc);
        }
    });
}

Post.getTags = function (callback) {
    postmodel.distinct('tags',{},function (err,result) {
        if(err){
            return callback(err);
        }
        callback(err,result);

    })
}

Post.getTag = function (tag,callback) {
    postmodel.find({tags:tag},null,{sort:{time:-1}},function (err,doc) {
        if (err || doc.length==0){
            return callback(err);
        }
        if (doc.length){
           // return callback(null,doc);
            return callback(null,doc);
        }
    });
}

Post.search = function(keyword,callback){
    var pat = new RegExp("^.*"+keyword+".*$","i");
    postmodel.find({title:pat}).sort({'time':-1}).exec(function (err,docs) {
        if (err){
            return callback(err);
        }
        return callback(null,docs);
    })


}

Post.reprint = function (reprint_from,reprint_to,callback) {
    postmodel.find({username:reprint_from.username,time:reprint_from.time,title:reprint_from.title},function (err,doc) {
        if (err){
            console.log('1111');
            return callback(err);
        }
        var date = new Date();
        var time=date.getFullYear()+"-"+(date.getMonth()+1)+"-"+
        date.getDate()+"-"+date.getHours()+"-"+date.getMinutes();
        //doc[0]为被转载的文章
        var docin = doc;
         docin.title = (doc[0].title.search(/[转载]/) > -1) ? doc[0].title : '[转载]'+doc[0].title;
         docin.comment = [];
         docin.reprint_info = {"reprint_from":reprint_from};
         docin.pv = 0;

        postmodel.update({username:reprint_from.username,time:reprint_from.time,title:reprint_from.title},{$push:{'reprint_info.reprint_to':{"username":reprint_to.tousername,"time": time,"title":docin.title}}},{multi:false},function (err) {
            if (err){
                console.log('12222');
                return callback(err);
            }
            var newpost1 = new postmodel({
                username:reprint_to.tousername,
                time:time,
                title:docin.title,
                postcontent:doc[0].postcontent,
                tags:doc[0].tags,
                pv : docin.pv,
                reprint_info:docin.reprint_info
            });
            newpost1.save(function (err) {
                if (err){
                    console.log('3333');
                    return    callback(err);
                }
                callback(null);
            });
        });



    })
}
