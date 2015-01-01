/**
 * Module: The main app controller
 * Description: Sets up the app server. Initializes drivers and controllers
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var program = require('commander');
var path = require('path');
var express = require('express');
var http = require('http');
var async = require('async');
var uuid = require('node-uuid');
//________END Package Dependencies_________\\
//##########################################\\


//_______________________________________\\
//----====|| Local Dependencies ||====----\\
var app_config = require('./config/app.json');
var locales = require('./config/locales.json');
var share = require('./modules/share'); //utility Wes wrote for data betwen node files instead of session
var logger = require('./modules/logger');
var ip_util = require('./modules/ip_util');
var fuiapi = require('./modules/fuiapi');
//________END Local Dependencies_________\\
//########################################\\


//____________________________\\
//----====|| Helpers ||====----\\
var env_config = app_config.env_config[app_config.env];
var localization = locales[app_config.lang];
var debug = env_config.debug;
//________END Helpers_________\\
//#############################\\


//____________________________________\\
//----====|| Program Startup ||====----\\
program
  .version(app_config.version)
  .option('-s, --seed', localization.mongo.param_instructions)
  .option('-a, --auth [user]', localization.auth.param_instructions)
  .option('-p, --protocol [http|https]', localization.protocol.param_instructions)
  .parse(process.argv);
//________END Program Startup_________\\
//#####################################\\


//________________________________\\
//----====|| Log Host IP ||====----\\
var host_ip = ip_util.getIpAddress();
logger.log(logger.INFO, localization.common.host_ip + ": " + host_ip);
//________END Log Host IP_________\\
//#################################\\


//_____________________________\\
//----====|| Load App ||====----\\
var app = express();

// all environments
app.set('port', process.env.PORT || env_config.ports.app);
app.set('views', env_config.paths.views);
app.set('view engine', app_config.view_engine);
app.use(express.favicon());
app.use(express.logger(app_config.env.toLowerCase()));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(env_config.salts.cookie));
app.use(express.session({secret: env_config.salts.session}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only - show full error stack traces
if ('development' === app.get('env')) {
    app.use(express.errorHandler());
}
//________END Load App_________\\
//##############################\\


//_________________________________\\
//----====|| Load Drivers ||====----\\
var loadedDrivers = {};

for (var driver_name in env_config.drivers) {

    loadedDrivers[driver_name] = function(callback) {

        if (!env_config.drivers[driver_name].enabled) { return; }

        var driver = require('./drivers/' + driver_name);
        driver.init(program, share);

        callback(null, driver);
    };
}

async.parallel(loadedDrivers, function(err, drivers) {

    //_____________________________________\\
    //----====|| Load Controllers ||====----\\
    var controllers = {};
    var controller = null;

    for (var provider in env_config.data_providers) {

        if (!env_config.data_providers[provider].enabled) {
            continue; }

        controller = require('./controllers/' + provider);
        controller.init(program, app, share, drivers);
        controllers[provider] = controller;
    }
    //________END Load Controllers________\\
    //#####################################\\

    //________________________________\\
    //----====|| Load FUIAPI ||====----\\
    fuiapi.config(app, share, drivers, controllers);
    //____________________________________\\
    //----====|| END Load FUIAPI ||====----\\
});
//________END Load Drivers________\\
//#################################\\


app.get('/login', function(req, res) {

    // The first time a user visits we give them a unique ID to track them with
    if (!req.session.uuid) {
        req.session.uuid = uuid.v4();
    }

    res.render('login');
});

app.get('/logout', function(req, res) {

    if (req.session.uuid) {
        fuiapi.destroyStreams(req, res, true);
        share.set(null, 'user', req.session.uuid);
        share.set(null, 'report', req.session.uuid);
        share.set(null, 'twitter_auth', req.session.uuid);
        share.set(null, 'twitData', req.session.uuid);
        share.set(null, 'twit', req.session.uuid);
        req.session.uuid = null;
        req.session = null;
    }

    res.redirect('login');
});


//__________________________________\\
//---====|| START LISTENING ||====---\\
http.createServer(app).listen(app.get('port'), function() {
    logger.log(logger.INFO, localization.express.listening + app.get('port'));
});
//______________________________________\\
//#######################################\\
