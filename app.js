
/**
 * Module dependencies.
 */
var _ = require('lodash');
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var util = require('util');
var OAuth = require('oauth').OAuth;
var mongodb = require('mongodb');
var fs = require('fs');
var share = require('./modules/share')
var program = require('commander');
var uuid = require('node-uuid');

routes.setShare(share);

program
  .version('0.0.1')
  .option('-s, --seed','Initialize mongo with seed data')
  .option('-t, --twitter [user]', 'Whose access credentials to use for accessing Twitter')
  .parse(process.argv);

var twitter_credentials_to_use = 'anthony';
if(program.twitter) twitter_credentials_to_use = program.twitter

var twitter_credentials = JSON.parse(fs.readFileSync('./config/twitter.json'))[twitter_credentials_to_use];

share.set(twitter_credentials, 'twitter_credentials');

var app = express();

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
var oa = new OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	twitter_credentials.api_key,
	twitter_credentials.api_secret,
	"1.0",
	"http://localhost:3000/auth/twitter/callback",
	"HMAC-SHA1"
);

//var MONGO_URL="mongodb://suddenfeedback:d34thRAY!B00m!@kahana.mongohq.com:10090/feedback"
var MONGO_URL="mongodb://127.0.0.1:27017/suddenfeedback"
var MongoClient = mongodb.MongoClient

// Placeholders
var dbUsers, dbOptions, dbReports, dbTerms = {};

MongoClient.connect(MONGO_URL, function(err, db) {
	  if(err) {
	  	console.log('Cannot connect to mongo!');
	  	process.exit(-1);
	  }
	  dbUsers = db.collection('users');
	  dbOptions = db.collection('options');
	  dbReports = db.collection('reports');
	  dbTerms = db.collection('terms');

	  console.log('Connected to mongo');

	  if(program.seed) {
	  	console.log('Seeding mongo');
		var default_report = JSON.parse(fs.readFileSync('default_report.json'));
		var default_terms = JSON.parse(fs.readFileSync('default_terms.json'));
		dbReports.insert(default_report, function(){});
		dbTerms.insert(default_terms, function(){});
	  }
});

app.get('/auth/twitter', function(req, res) {
	oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
		if (error) {
			console.log(error);
			res.send("yeah no. didn't work.")
		} else {
			share.set({
				"oauth_token": oauth_token,
				"oauth_token_secret": oauth_token_secret
			},'oauth', req.session.uuid);

			res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token)
		}
	});
});

app.post('/fuiapi', function(req, res, next) {
	var strAction = req.param('a', null); //todo: check post var against array of allowed options
	//console.log(strAction);
	var report = {};
	var d = req.param('q',null); //console.log(d);
	//res.send(JSON.stringify([{Label:'good'}]));
	  
	if(strAction=='init'){ 
		//get the report settings, if multiple grab the users most recent
	 dbReports.findOne({}, function(err, report){ 
	 	//do a little report cleanup if needed
	 	_.forEach(report.columns,function(objCol,i){ 
	 		if(!objCol.score){ report.columns[i].score=0; } //set an initial analysis score if it doesnt exist
	 	});
	 	share.set(report,'report',req.session.uuid);
		res.send(report);
	 });
	//get the word sets used
	}
	if(strAction=='saveReport'){ 
	var d = req.param('q',null); 
	  	dbReports.update( {_id:d._id},{columns:d.columns,terms:d.terms},{upsert:true,safe:true},
		function(err,data){if (err){res.send('error');}else{res.send('success');}});
	//todo: save to session for server side use
	};
	if(strAction=='saveTerms'){ 
	var d = req.param('q',null); 
	  	//console.log(d);
	  	for(var i=0; i<d.length;i++){
		  	dbTerms.update( {_id:d[i].user+':'+d[i].name},{user:d[i].user,name:d[i].name,terms:d[i].terms},{upsert:true,safe:true},
			function(err,data){if (err){res.send('error');}else{res.send('success');}});
	  	}
	};
	//todo: save to session for server side use
});

var twitter = require('ntwitter');
app.get('/auth/twitter/callback', function(req, res, next) {
	var oauth = share.get('oauth',req.session.uuid);
	
	if (oauth) {
		oauth.oauth_verifier = req.query.oauth_verifier;
		
		oa.getOAuthAccessToken(oauth.oauth_token, oauth.oauth_token_secret, oauth.oauth_verifier,
			function(error, oauth_access_token, oauth_access_token_secret, results) {
				console.log(results);

				if (error) {
					console.log(error);
					res.send("yeah something broke.");
				} else {
					oauth.access_token = oauth_access_token;
					oauth.access_token_secret = oauth_access_token_secret;
					share.set(oauth,'oauth', req.session.uuid);

					//console.log(req);
					var twit = new twitter({
						consumer_key: twitter_credentials.api_key,
						consumer_secret: twitter_credentials.api_secret,
						access_token_key: oauth.access_token,
						access_token_secret: oauth.access_token_secret
					});
					twit.verifyCredentials(function(err, data) {
						if(err) {
							console.log('error verifying twit credentials',err);
						} else {
							//console.log('success verifying twit credentials ', data);
							res.redirect('/');
						}
					});
				}
			}
		);
	} else{ next(new Error("you're not supposed to be here.")); }
});