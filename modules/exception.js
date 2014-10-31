/**
 * Module: Exception
 * Description: Handles exceptions thrown by the system
 */

var app_config = require('../config/app.json');
var logger = require('../modules/logger');

var env_config = app_config.env_config[app_config.env];


/**
 * Class Exception
 */
var Exception = function() {};

Exception.prototype.throw = function(msg, suppress_logs) {

    if (!suppress_logs) {
        logger.log(logger.ERROR, msg);
    }

    if (env_config.throw_exceptions) {
        throw "[" + logger.ERROR.toUpperCase() + "] " + msg;
    }
};


module.exports = new Exception();
