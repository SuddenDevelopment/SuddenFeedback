/**
 * Module: Exception
 * Description: Handles exceptions thrown by the system
 * Last Modified: 10-11-2014 by Andrew Forth
 */

var fs = require('fs');
var appConfig = require('../config/app.json');
var logger = require('../modules/logger');

/**
 * Class Exception
 */
var Exception = function() {
    this.env = appConfig.env;
    this.env_config = appConfig.env_config;
};

Exception.prototype.throw = function(msg, suppress_logs) {

    logger.log(logger.ERROR, msg);

    if (this.env_config[this.env].throw_exceptions) {
        throw "[" + logger.ERROR.toUpperCase() + "] " + msg;
    }
};


module.exports = new Exception();
