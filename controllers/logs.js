'use strict';

/**
 * Module: LogsController
 * Description: Handles execution of routes related to logs
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var uuid = require('node-uuid');
//________END Package Dependencies_________\\
//##########################################\\


//_______________________________________\\
//----====|| Local Dependencies ||====----\\
var app_config = require('../config/app.json');
var locales = require('../config/locales.json');
var logger = require('../modules/logger');
var util = require('../modules/util');
//________END Local Dependencies_________\\
//########################################\\


//____________________________\\
//----====|| Helpers ||====----\\
var env_config = app_config.env_config[app_config.env];
var localization = locales[app_config.lang];
var debug = env_config.debug;
//________END Helpers_________\\
//#############################\\


/**
 * Class LogsController
 */
var LogsController = function() {
    this.share = null;
    this.auth = null;
    this.credentials = {};
};

LogsController.prototype.init = function(program, app, share) {
    var self = this;
    self.share = share;

    self.loadRoutes(app);
};

LogsController.prototype.loadRoutes = function(app) {
    var self = this;
    //app.get('/auth/twitter', self.authUser.bind(self));
    //app.get('/auth/twitter/callback', self.authUserCallback.bind(self));
};

// @Todo - this currently does not authorize on a per action basis. It merely
// checks that the user has authenticated in general with the data provider.
LogsController.prototype.authorizeAction = function(req) {
    var self = this;
    return self.share.get('logs_auth', req.session.uuid);
};

LogsController.prototype.authUser = function(req, res) {
    var self = this;
};

LogsController.prototype.authUserCallback = function(req, res, next) {
    var self = this;
};

LogsController.prototype.destroyStream = function(req, res) {
    var self = this;
};

//_________________________\\
//----====|| MAIN ||====----\\
LogsController.prototype.index = function(req, res) {
    var self = this;
    //console.log(req.session.term);

    // The first time a user visits we give them a unique ID to track them with
    if (!req.session.uuid) {
        req.session.uuid = uuid.v4();
    }

    res.render('index', { title: 'SuddenFeedback' });
};
//________END MAIN_________\\
//##########################\\


module.exports = new LogsController();
