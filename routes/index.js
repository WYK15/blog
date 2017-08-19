var express = require('express');
var router = express.Router();
var User = require('../Model/User');
var postdb = require('../Model/post');
var crypto = require('crypto');
var multiparty = require('multiparty');
var util = require('util');
var fs = require('fs');
var Commentmodel =require("../Model/comment");

/* GET home page. */
router.get('/', function(req, res) {
    var page = req.query.p ? parseInt(req.query.p) : 1;
    postdb.count({},function (err,count) {
        if (err){
            req.flash('error','查询失败');
            return res.redirect('back');
        }
        postdb.getten(null,page,function (err,posts) {
            if (err){
                posts = [];
            }
            res.render('index', {
                title: '主页',
                user:req.session.user,
                posts:posts,
                page : page,
                isFirstPage:page==1,
                isLastPage:(page-1)*5+posts.length==count
            });
        })
    })
});


router.get('/u/:name/:title/:time',checklogin);
router.get('/u/:name/:title/:time',function (req,res) {
    postdb.get({username:req.params.name,title:req.params.title,time:req.params.time},function (err,posts) {
        if (err){
            posts = [];
        }
        res.render('article',{
            user:req.session.user,
            title:req.params.title,
            post : posts[0]
        })
    });
})


router.get('/search',function (req,res) {
    postdb.search(req.query.keyword,function (err,docs) {
        if (err){
            req.flash('error',err);
            return res.redirect('/')
        }
        res.render('search',{
            title:"SEARCH"+req.query.keyword,
            posts:docs,
            user:req.session.user
        })
    })
});

router.get('/reg',checknotlogin);
router.get('/reg', function(req, res, next) {
    res.render('reg', {
        title: '注册',
        user:req.session.user,
    });
});

router.get('/login',checknotlogin);
router.get('/login', function(req, res, next) {
    res.render('login', { title: '登录',
        user:req.session.user,
    });
});


router.get('/links',function (req,res) {
    res.render('links',{
        title:'友情链接',
        user:req.session.user,
    })
});

router.post('/reg',checknotlogin);
router.post('/reg', function(req, res, next) {
    //注册
    var name = req.body.username;
    var password = req.body.password;
    var repassword = req.body.repassword;
    var mail = req.body.mail;
    //检查password和repassword是否相等，name是否已经存在
    if (password!=repassword){
        req.flash('error','两次输入的密码不一样');
        return res.redirect('/reg');
    }
    //生成密码的md5的值
    var md5 = crypto.createHash('md5'),
        passwordmd5 = md5.update(req.body.password).digest('hex');
    var auser = new User({username:req.body.username,password:passwordmd5,mail:req.body.mail});
    //检车用户名是否存在
    User.get(name,function (err,doc) {
        if (err){
         req.flash('error',err);
         return res.redirect('/');
        }
        if (doc.length) {
            req.flash('error',"用户名已存在");
            return res.redirect('/reg');
        }else{
            auser.save(function (err,doc) {
               if (err){
                   req.flash('error',err);
                   return res.redirect('/');
               }
                   req.flash('success', '注册成功');
                   req.session.user = doc;
                 res.redirect('/');

            });
        }
    });
});

router.post('/login',checknotlogin);
router.post('/login', function(req, res) {
    var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');

    User.get(req.body.username,function (err,doc) {
        if (err){
            req.flash('error','出错了');
            return res.redirect('/login');
        }
        if(!doc.length){
            req.flash('error','用户不存在');
            return res.redirect('/login');
        }
        if (password!=doc[0].password){
                req.flash('error',"密码错误");
                return res.redirect('/login');
        }
        req.session.user = doc[0];
        req.flash('success','登录成功');
        return res.redirect('/');
    })
});


router.get('/logout',checklogin);
router.get('/logout',function (req,res,next) {
    req.session.user = null;
    req.flash('success',"登出成功");
    return res.redirect('/');
});

router.get('/post',checklogin);
router.get('/post',function (req,res) {
    res.render('post',{
        title:'发表',
        user:req.session.user
    })
});

router.post('/post',checklogin);
router.post('/post',function (req,res) {
    var currentuser = req.session.user;
    var date = new Date();
    var tags = [req.body.tag1,req.body.tag2,req.body.tag3];
    var newpost = new postdb({
        username:currentuser.username,
        time:date.getFullYear()+"-"+(date.getMonth()+1)+"-"+
            date.getDate()+"-"+date.getHours()+"-"+date.getMinutes(),
        title:req.body.title,
        tags : tags,
        postcontent:req.body.post
    });
    newpost.save(function (err) {
        if (err){
            req.flash('error',err);
            return res.redirect('/post');
        }
        req.flash('success','发布成功!');
        return res.redirect('/post');
    });

});

router.get('/upload',checklogin);
router.get('/upload',function (req,res) {
    res.render('upload',{
        title:"文件上传",
        user:req.session.user
    })
});

router.get('/tags',function (req,res) {
    postdb.getTags(function (err,result) {
        if (err){
            return req.flash('error',err);
        }
        res.render('tags',{
            title:'标签',
            result:result,
            user:req.session.user
        })
    })
});


router.get('/tags/:tag',function (req,res) {
    postdb.getTag(req.params.tag,function (err,docs) {
        if (err){
            req.flash('error',err);
            return res.redirect('/');
        }
        res.render('tag',{
            title:'TAG:'+req.params.tag,
            docs:docs,
            user:req.session.user
        })
    })

});

router.post('/upload',checklogin);
router.post('/upload',function (req,res) {
    //生成multiparty对象，并配置上传目标路径
    var form = new multiparty.Form({uploadDir:'./public/files/'});
    var count = 0;
    form.parse(req, function(err, fields, files){
        for(file in files){
            if (files[file][0].originalFilename!=''){
                count++;
                fs.rename(files[file][0].path,'./public/files/'+files[file][0].originalFilename,function (err) {
                    if (err){
                        req.flash('error',files[file][0].originalFilename+'上传失败');
                    }
                });
            }
        }
        req.flash('success',count+'个文件上传成功');
        return res.redirect('/upload');
    });

});

router.get('/u/:name',checklogin);
router.get('/u/:name',function (req,res) {
    var page = req.query.p ? parseInt(req.query.p) : 1;
    postdb.count({username:req.params.name},function (err,count) {
        if (err){
            req.flash('error','查询失败');
            return res.redirect('back');
        }
        postdb.getten(req.params.name,page,function (err,posts) {
            if (err){
                posts = [];
            }
            res.render('user', {
                title: req.params.name,
                user:req.session.user,
                posts:posts,
                page : page,
                isFirstPage:page==1,
                isLastPage:(page-1)*5+posts.length==count
            });
        })
    })


});

router.get('/archive',function (req,res) {
    postdb.archive(function (err,docs) {
        if (err){
            req.flash('error','失败');
            return res.redirect('back');
        }
        res.render('archive',{
            title:"存档",
            posts:docs,
            user:req.session.user
        });
    })
});

router.get('/test',function (req,res) {
    res.render('kindedit',{})
})



router.post('/u/:name/:title/:time',checklogin);
router.post('/u/:name/:title/:time',function (req,res) {
    var date = new Date();
    var time=date.getFullYear()+"-"+(date.getMonth()+1)+"-"+ date.getDate()+"-"+date.getHours()+"-"+date.getMinutes();


    var commentarr = {
        name:req.params.name,
        email:req.body.email,
        website:req.body.website,
        time:time,
        content:req.body.content
    };
    console.log(req.params.name+req.params.time+req.params.title+commentarr);
  var newcomment = new Commentmodel(req.params.name,req.params.time,req.params.title,commentarr);
    newcomment.save(function (err,num) {
     if (err){
     req.flash('error','留言失败');
     return res.redirect('back');
     }
     req.flash('success','留言成功');
     res.redirect('back');
     })

  //console.log(req.params.name,req.params.time,req.params.title,req.body.content);

})


router.get('/edit/:name/:title/:time',checklogin);
router.get('/edit/:name/:title/:time',function (req,res) {
    postdb.get({username:req.param('name'),title:req.param('title'),time:req.param('time')},function (err,posts) {
        if (err){
            posts = [];
        }
        res.render('edit',{
            user:req.session.user,
            title:req.param('title'),
            posts:posts[0]
        })
    });
})

router.post('/edit/:name/:title/:time',checklogin);
router.post('/edit/:name/:title/:time',function (req,res) {
    postdb.update({username:req.params.name,title:req.params.title,time:req.params.time},{postcontent:req.body.posttext},function (err) {
     if (err){
         return alert('修改失败');
     }
        req.flash('success','修改成功');
        res.redirect('/u/'+req.params.name+'/'+req.params.title+'/'+req.params.time);
        //u前面加/表示url从根目录开始，否则变成 http://localhost:3000/edit/leowang/wheos/u/leowang/wheos/2017-8-1-11-47
    })
})

router.get('/delete/:name/:title/:time',checklogin);
router.get('/delete/:name/:title/:time',function (req,res) {
    postdb.delete({username:req.params.name,title:req.params.title,time:req.params.time},function (err,posts) {
        if (err){
            req.flash('error','删除失败');
            return res.redirect('/');
        }
        req.flash('success','删除成功');
        res.redirect('/');

    });
})



router.get('/reprint/:name/:time/:title',function (req,res) {
    postdb.reprint({username:req.params.name,time:req.params.time,title:req.params.title},{tousername:req.session.user.username},function (err,doc) {
        if (err){
            req.flash('error','转载失败'+err);
            return res.redirect('/');
        }
        req.flash('success','转载成功');
        res.redirect('/');
    })
});

module.exports = router;


function checklogin(req,res,next){
    if (!req.session.user){
        req.flash('error','未登录');
        return res.redirect("/login");
    }
    next();
}


function checknotlogin(req,res,next){
    if (req.session.user){
        req.flash('error','已登录');
        return res.redirect('back');
    }
    next();
}