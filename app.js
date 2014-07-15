
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var util = require('util');
var OAuth = require('oauth').OAuth;
var mongodb = require('mongodb');
var fs = require('fs');

var app = express();

var default_report = JSON.parse(fs.readFileSync('default_report.json'));

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('this is just SALT in a wound'));
app.use(express.session({secret: "this is just SALT in a wound"}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {app.use(express.errorHandler());}

app.get('/', routes.index);
//app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function() { console.log('Express server listening on port ' + app.get('port')); });



/*
 * GET home page.
  consumer_key: '9kFmLFgQw25ls1lvY4VLHCpDN',
    consumer_secret: 'qyw9KEhgqMBSXvEZJhwLXvUyMiFtRKbArPSxxW1b97V0A6qUT3',
    access_token: '961522914-MYbXA2PLITQplMieKLje0zP0L3ddad1FN8xFKMUY',
    access_token_secret: '2N3WH09m2la6q7xMKzKc34ZWq9ySgypqbxreGnYPGTJ5J'
 */
//var MONGO_URL="mongodb://suddenfeedback:d34thRAY!B00m!@kahana.mongohq.com:10090/feedback"
var MONGO_URL="mongodb://127.0.0.1:27017/suddenfeedback"
var oa = new OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	"9kFmLFgQw25ls1lvY4VLHCpDN",
	"qyw9KEhgqMBSXvEZJhwLXvUyMiFtRKbArPSxxW1b97V0A6qUT3",
	"1.0",
	"http://localhost:3000/auth/twitter/callback",
	"HMAC-SHA1"
);

var MongoClient = mongodb.MongoClient
/*
app.post('/fuiapi', function(req, res){
  var column = req.param('column', null);
  var terms = req.param('colTerms', null);  // second parameter is default

  //console.log(terms);
if(req.session.arrTerms == undefined){req.session.arrTerms=[terms];}else{req.session.arrTerms.push(terms);}
  res.redirect('back');
  //console.log(email);
});
*/
app.get('/auth/twitter', function(req, res) {
	oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
		if (error) {
			console.log(error);
			res.send("yeah no. didn't work.")
		} else {
			req.session.oauth = {};
			req.session.oauth.token = oauth_token;
			//console.log('oauth.token: ' + req.session.oauth.token);
			req.session.oauth.token_secret = oauth_token_secret;
			//console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
			res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token)
		}
	});
});

app.post('/fuiapi', function(req, res, next) {
	var strAction = req.param('a', null); //todo: check post var against array of allowed options
	console.log(strAction);
	var d = req.param('q',null); console.log(d);
	//res.send(JSON.stringify([{Label:'good'}]));
	MongoClient.connect(MONGO_URL, function(err, db) {
	  var dbUsers = db.collection('users');
	  var dbOptions = db.collection('options');
	  var dbReports = db.collection('reports');
	  var dbTerms = db.collection('terms');
	  if(strAction=='init'){ dbReports.findOne({}, function(err, doc){ 
	  	//console.log(doc); 
	  	if(doc) {
	  		res.send(doc); 
	  		req.session.report=doc;
	  	} else {
	  		// Report isn't loaded into mongo so let's load it from disk
	  		res.send(default_report);
	  		req.session.report=default_report;
	  	}
	  }); }
	  if(strAction=='saveReport'){ 
	  	dbReports.update( {_id:d._id},{columns:d.columns},{upsert:true,safe:true},
		    function(err,data){if (err){console.log(err);}else{console.log(d);}});
	  }
	  //collection.remove(function(err, result) { if(err) { return console.error(err); } //truncate
	  //dbOptions.insert(objhere, function(err,docs) { if(err) { return console.error(err); }
      
      //todo: save to session for server side use
	});
});

var twitter = require('ntwitter');
app.get('/auth/twitter/callback', function(req, res, next) {
	if (req.session.oauth) {
		req.session.oauth.verifier = req.query.oauth_verifier;
		var oauth = req.session.oauth;

		oa.getOAuthAccessToken(oauth.token, oauth.token_secret, oauth.verifier,
			function(error, oauth_access_token, oauth_access_token_secret, results) {
				if (error) {
					console.log(error);
					res.send("yeah something broke.");
				} else {
					req.session.oauth.access_token = oauth_access_token;
					req.session.oauth.access_token_secret = oauth_access_token_secret;
					//console.log(results);
					//console.log(req);
					var twit = new twitter({
						consumer_key: "A6x1nzmmmerCCmVN8zTgew",
						consumer_secret: "oOMuBkeqXLqoJkSklhpTrsvuZXo9VowyABS8EkAUw",
						access_token_key: req.session.oauth.access_token,
						access_token_secret: req.session.oauth.access_token_secret
					});
					twit.verifyCredentials(function(err, data) {
							console.log(err, data);
							res.redirect('/');
						});

				}
			}
		);
	} else
		next(new Error("you're not supposed to be here."))
});