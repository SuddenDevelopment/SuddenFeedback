/**
 * Module: Exception
 * Description: Handles exceptions thrown by the system
 * Last Modified: 10-12-2014 by Andrew Forth
 */

var app_config = require('../config/app.json');
var logger = require('../modules/logger');

var should_throw = app_config.env_config[app_config.env].throw_exceptions;

/**
 * Class Exception
 */
var Exception = function() {};

Exception.prototype.throw = function(msg, suppress_logs) {

    if (!suppress_logs) {
        logger.log(logger.ERROR, msg);
    }

    if (should_throw) {
        throw "[" + logger.ERROR.toUpperCase() + "] " + msg;
    }
};


module.exports = new Exception();
