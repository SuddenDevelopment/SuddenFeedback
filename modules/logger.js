/**
 * Module: Logger
 * Description: Handles messages logged by the system
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var fs = require('fs');
//________END Package Dependencies_________\\
//##########################################\\


//_______________________________________\\
//----====|| Local Dependencies ||====----\\
var app_config = require('../config/app.json');
var locales = require('../config/locales.json');
//________END Local Dependencies_________\\
//########################################\\


//____________________________\\
//----====|| Helpers ||====----\\
var env_config = app_config.env_config[app_config.env];
var localization = locales[app_config.lang];
//________END Helpers_________\\
//#############################\\


/**
 * Class Logger
 */
var Logger = function() {

    this.logs_disabled = env_config.logs_disabled;
    this.log_levels = env_config.log_levels;
    this.log_path = env_config.paths.logs;

    this.INFO = "info";
    this.DEBUG = "debug";
    this.ERROR = "error";
};

Logger.prototype.log = function(level, msg, data) {

    if (this.logs_disabled) {
        return localization.common.disabled;
    } else if (this.log_levels.indexOf(level) === -1) {
        return localization.logs.unsupported_level;
    }

    var formatted_msg = "";

    if (env_config.log_output_types.indexOf("console") !== -1) {

        formatted_msg = (new Date()) + " - [" + level.toUpperCase() + "] - " + msg + "\n";

        if (data) {
            console.log(formatted_msg, data);
        } else {
            console.log(formatted_msg);
        }

    }

    if (env_config.log_output_types.indexOf("file") !== -1) {

        formatted_msg = (new Date()) + " - " + msg + (data ? "\n" + JSON.stringify(data) : "") +  "\n";

        fs.appendFile(this.log_path + level + ".log", formatted_msg, function(){});
    }
};

module.exports = new Logger();
