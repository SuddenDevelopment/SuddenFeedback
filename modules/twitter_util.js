/**
 * Module: TwitterUtil
 * Description: Provides utilities for working with Twitter
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var _ = require('lodash');
var fs = require('fs');
//________END Package Dependencies_________\\
//##########################################\\


//_______________________________________\\
//----====|| Local Dependencies ||====----\\
var app_config = require('../config/app.json');
var locales = require('../config/locales.json');
var logger = require('./logger');
var exception = require('./exception');
//________END Local Dependencies_________\\
//########################################\\


//____________________________\\
//----====|| Helpers ||====----\\
var env_config = app_config.env_config[app_config.env];
var localization = locales[app_config.lang];
//________END Helpers_________\\
//#############################\\


/**
 * Class TwitterUtil
 */
var TwitterUtil = function() {};

/**
 * Returns the Twitter credentials for the user account passed in
 * by the --twitter -t argument
 */
TwitterUtil.prototype.getCredentials = function(apiAccount, callback) {
    if ('undefined' === typeof apiAccount) {
        exception.throw(localization.twitter.parameter_not_present);
    } else {
        logger.log(logger.INFO, localization.twitter.using_credentials + apiAccount);

        var authConfig = JSON.parse(fs.readFileSync(env_config.auth.config_path));

        if (!_.has(authConfig, 'twitter') && !_.has(authConfig['twitter'], apiAccount)) {
            exception.throw(localization.twitter.config_does_not_exist);
        }

        callback(authConfig['twitter'][apiAccount]);
    }
};

module.exports = new TwitterUtil();
