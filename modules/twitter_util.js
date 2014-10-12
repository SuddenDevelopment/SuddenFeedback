/**
 * Module: TwitterUtil
 * Description: Provides utilities for working with Twitter
 * Last Modified: 10-11-2014 by Andrew Forth
 */

var _ = require('lodash');
var fs = require('fs');

var app_config = require('../config/app.json');
var localization = require('../config/localization.json');
var logger = new require('./logger');
var exception = new require('./exception');

/**
 * Class TwitterUtil
 */
var TwitterUtil = function() {};

/**
 * Returns the Twitter credentials for the user account passed in
 * by the --twitter -t argument
 */
TwitterUtil.prototype.getCredentials = function(program, callback){

    if('undefined' === typeof(program.twitter)){
        exception.throw(localization[app_config.lang].twitter.parameter_not_present);
    } else {
        logger.log(logger.INFO, localization[app_config.lang].twitter.using_credentials + program.twitter);

        var twConfig = JSON.parse(fs.readFileSync(app_config.env_config[app_config.env].twitter.config_path));

        if (!_.has(twConfig, program.twitter)) {
            exception.throw(localization[app_config.lang].twitter.config_does_not_exist);
        }

        callback(twConfig[program.twitter]);
    }

};

module.exports = new TwitterUtil();
