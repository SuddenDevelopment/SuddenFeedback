/**
 * package.json dependencies.
 */
var _ = require('lodash');
var express = require('express');
var http = require('http');
var path = require('path');
var util = require('util');
var OAuth = require('oauth').OAuth;
var mongodb = require('mongodb');
var fs = require('fs');
var program = require('commander');
var uuid = require('node-uuid');
var os = require('os');

/**
 * Local module dependencies.
 */
var app_config = require('./config/app.json');
var localization = require('./config/localization.json');
var user = require('./routes/user');
var share = require('./modules/share'); //utility wes wrote for data betwen node files instead of session
var logger = require('./modules/logger');
var exception = require('./modules/exception');
var reportHandler = require('./modules/report');
var twitter_util = require('./modules/twitter_util');
var ip_util = require('./modules/ip_util');
var noop = require('./modules/noop');
var fuiapi = require('./modules/fui_api');

var routes = require('./routes');
routes.setShare(share);

var debug = app_config.env_config[app_config.env].debug;

program
  .version(app_config.version)
  .option('-s, --seed', localization[app_config.lang].mongo.param_instructions)
  .option('-t, --twitter [user]', localization[app_config.lang].twitter.param_instructions)
  .option('-p, --protocol [http|https]', localization[app_config.lang].protocol.param_instructions)
  .parse(process.argv);

var PROTOCOL = program.protocol || app_config.env_config[app_config.env].protocol;
var PORT = process.env.PORT || app_config.env_config[app_config.env].port;

var host_ip = ip_util.getIpAddress();
logger.log(logger.INFO, localization[app_config.lang].common.host_ip + ": " + host_ip);

var twitter_credentials;
var oa;

twitter_util.getCredentials(program, function (creds) {
    twitter_credentials = creds;
    share.set(twitter_credentials, 'twitter_credentials');

    /*
     * GET home page.
          consumer_key: '9kFmLFgQw25ls1lvY4VLHCpDN',
        consumer_secret: 'qyw9KEhgqMBSXvEZJhwLXvUyMiFtRKbArPSxxW1b97V0A6qUT3',
        access_token: '961522914-MYbXA2PLITQplMieKLje0zP0L3ddad1FN8xFKMUY',
        access_token_secret: '2N3WH09m2la6q7xMKzKc34ZWq9ySgypqbxreGnYPGTJ5J'
     */
    oa = new OAuth(
        app_config.env_config[app_config.env].twitter.request_token_url,
        app_config.env_config[app_config.env].twitter.access_token_url,
        twitter_credentials.api_key,
        twitter_credentials.api_secret,
        app_config.env_config[app_config.env].oauth.version,
        PROTOCOL + "://" + host_ip + ":"+ PORT + app_config.env_config[app_config.env].oauth.callback_path,
        app_config.env_config[app_config.env].oauth.mac_type
    );
});

var app = express();

// all environments
app.set('port', PORT);
app.set('views', app_config.views_dir);
app.set('view engine', app_config.view_engine);
app.use(express.favicon());
app.use(express.logger(app_config.env.toLowerCase()));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(app_config.env_config[app_config.env].salts.cookie));
app.use(express.session({secret: app_config.env_config[app_config.env].salts.session}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {app.use(express.errorHandler());}

app.get('/', routes.index);
//app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function() {
    logger.log(logger.INFO, localization[app_config.lang].express.listening + app.get('port'));
});

var MONGO_URL = app_config.env_config[app_config.env].mongo.conn_url;
var MongoClient = mongodb.MongoClient;
var MongoConn;
var mongo_collections = { users: null, reports: null, terms: null };

MongoClient.connect(MONGO_URL, function(err, db) {
      if(err) {
	  	  logger.log(logger.ERROR, localization[app_config.lang].mongo.no_conn);
	  	  process.exit(-1);
	  } else {
          logger.log(logger.INFO, localization[app_config.lang].mongo.conn);
      }

      MongoConn = db;

      for (var db_table in mongo_collections) {
          mongo_collections[db_table] = MongoConn.collection(db_table);
      }

      fuiapi.config(routes, mongo_collections);

	  if (program.seed) {
	  	logger.log(logger.INFO, localization[app_config.lang].mongo.seeding);

        var seeders = app_config.env_config[app_config.env].seeders;

        for (var seeder in seeders) {
            MongoConn.collection(seeder).insert(JSON.parse(fs.readFileSync(app_config.env_config[app_config.env].seeder_path + seeders[seeder])), noop);
        }
	  }
});

app.get('/auth/twitter', function(req, res) {
	oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
		if (error) {
			logger.log(logger.ERROR, error);
			res.send(localization[app_config.lang].oauth.no_request_token);
		} else {
			share.set({
				"oauth_token": oauth_token,
				"oauth_token_secret": oauth_token_secret
			},'oauth', req.session.uuid);

			res.redirect(app_config.env_config[app_config.env].twitter.auth_url_prefix + oauth_token)
		}
	});
});

 //_______________________\\
//----====|| API ||====----\\
app.post('/fuiapi', function(req, res, next) {
	var strAction = req.param('a', null);

    if (fuiapi[strAction]) {
		fuiapi[strAction](req, res, next);
	} else {
		res.send('error');
	}
});

 //________END API________\\
//#########################\\


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
					res.send(localization[app_config.lang].oauth.access_token_error);
				} else {
					oauth.access_token = oauth_access_token;
					oauth.access_token_secret = oauth_access_token_secret;
					share.set(oauth,'oauth', req.session.uuid);

					var twit = new twitter({
						consumer_key: twitter_credentials.api_key,
						consumer_secret: twitter_credentials.api_secret,
						access_token_key: oauth.access_token,
						access_token_secret: oauth.access_token_secret
					});

					twit.verifyCredentials(function(err, data) {
						if (err) {
                            logger.log(logger.ERROR, localization[app_config.lang].twitter.auth_failure, err);
						} else {
							logger.log(logger.DEBUG, localization[app_config.lang].twitter.auth_success, data);
							res.redirect('/');
						}
					});
				}
			}
		);
	} else {
        next(new Error(localization[app_config.lang].oath.unauthorized));
    }
});
