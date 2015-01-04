'use strict';

/**
 * Module: Stats
 *
 * Description: Generic stat handling module
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var util = require('util');
//________END Package Dependencies_________\\
//##########################################\\


//_______________________________________\\
//----====|| Local Dependencies ||====----\\
var app_config = require('../config/app.json');
//________END Local Dependencies_________\\
//########################################\\


//____________________________\\
//----====|| Helpers ||====----\\
var env_config = app_config.env_config[app_config.env];
//________END Helpers_________\\
//#############################\\


/**
 * Class Stats
 */
function Stats() {
    this.namespaces = {};
}

Stats.prototype.load = function(namespace, object) {
    var self = this;

    if (!object.stats) {
        return false;
    }

    if (!env_config.data_providers[namespace].stats_enabled) {
        return false;
    }

    self.namespaces[namespace] = {};

    for (var statPeriod in object.stats) {
        self.namespaces[namespace][statPeriod] = { timer: null, statIteration: 0 };
        self.namespaces[namespace][statPeriod]['timer'] = self.loadStatPeriod(namespace, object, statPeriod);
    }
};

Stats.prototype.loadStatPeriod = function(namespace, object, statPeriod) {
    var self = this;
    var statPeriodInMilliseconds = statPeriod * 1000;

    return setInterval(function() {
        self.namespaces[namespace][statPeriod].statIteration += 1;

        var stats = {
            total_items_processed: object.statTotalItemsProcessed,
            total_seconds_elapsed: (statPeriodInMilliseconds / 1000) * self.namespaces[namespace][statPeriod].statIteration,
            avg_items_per_second: (object.statTotalItemsProcessed / ((statPeriodInMilliseconds / 1000) * self.namespaces[namespace][statPeriod].statIteration)).toFixed(2),
            items_processed_in_period: object.stats[statPeriod].items_processed_in_period,
            period_in_seconds: (statPeriodInMilliseconds / 1000),
            avg_items_per_second_in_period: (object.stats[statPeriod].items_processed_in_period / (statPeriodInMilliseconds / 1000)).toFixed(2),
            memory: util.inspect(process.memoryUsage())
        };

        if (stats.total_seconds_elapsed > 60) {
            stats.total_minutes_elapsed = (stats.total_seconds_elapsed / 60).toFixed(2);
        }

        if (stats.total_seconds_elapsed > 3600) {
            stats.total_hours_elapsed = ((stats.total_seconds_elapsed / 60) / 60).toFixed(2);
        }

        if (stats.total_seconds_elapsed > 86400) {
            stats.total_days_elapsed = (((stats.total_seconds_elapsed / 60) / 60) / 24).toFixed(2);
        }

        console.log(self.namespaces[namespace][statPeriod].statIteration + ' * ' + object.stats[statPeriod].label + ' STATS: ', stats);
        console.log("\n");

        object.stats[statPeriod].items_processed_in_period = 0;

    }, statPeriodInMilliseconds);
};


module.exports = new Stats();
