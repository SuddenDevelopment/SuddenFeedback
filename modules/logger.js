/**
 * Module: Logger
 * Description: Handles messages logged by the system
 * Last Modified: 10-11-2014 by Andrew Forth
 */

var fs = require('fs');
var app_config = require('../config/app.json');
var localization = require('../config/localization.json');
var noop = require('../modules/noop');

/**
 * Class Logger
 */
var Logger = function() {
    this.env = app_config.env;
    this.env_config = app_config.env_config;
    this.log_levels = this.env_config[this.env].log_levels;
    this.log_path = this.env_config[this.env].log_path;
    this.logs_disabled = app_config.logs_disabled;

    this.INFO = "info";
    this.DEBUG = "debug";
    this.ERROR = "error";
};

Logger.prototype.log = function(level, msg, data) {

    if (this.logs_disabled) {
        return localization[this.config.lang].common.disabled;
    } else if (this.log_levels.indexOf(level) === -1) {
        return localization[this.config.lang].logs.unsupported_level;
    }

    var formatted_msg = "";

    if (this.env_config[this.env].log_output_types.indexOf("console") !== -1) {

        formatted_msg = (new Date()) + " - [" + level.toUpperCase() + "] - " + msg + "\n";

        if (data) {
            console.log(formatted_msg, data);
        } else {
            console.log(formatted_msg);
        }

    }

    if (this.env_config[this.env].log_output_types.indexOf("file") !== -1) {

        formatted_msg = (new Date()) + " - " + msg + (data ? "\n" + JSON.stringify(data) : "") +  "\n";

        fs.appendFile(this.log_path + level + ".log", formatted_msg, noop);
    }
};

module.exports = new Logger();
