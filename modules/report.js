/**
 * Module: Report
 * Description: Generates reports
 * Last Modified: 10-11-2014 by Andrew Forth
 */

var _ = require('lodash');
var fs = require('fs');
var appConfig = require('../config/app.json');
var logger = require('../modules/logger');

/**
 * Class Report
 */
var Report = function() {
    this.env = appConfig.env;
    this.env_config = appConfig.env_config;
};

Report.prototype.normalize = function(objReport){

    //do a little report cleanup if needed
    if (!objReport.colSort) {
        objReport.colSort = 'priority';
    }

    if (!objReport.titles) {
        objReport.titles = 'none';
    }

    if (!objReport.priority || objReport.priority < objReport.columns.length) {
        objReport.priority = objReport.columns.length;
    }

    _.forEach(objReport.columns,function(objCol,i) {

        if (!objCol.score) { //set an initial analysis score if it doesnt exist
            objReport.columns[i].score = 0;
        }

        if (!objCol.priority || objCol.priority < 1) {
            objReport.columns[i].priority = 1;
        }

        if (!objCol.components) {
            objReport.columns[i].components = [];
        }

        if (objCol.components.length) {
            _.forEach(objCol.components,function(objComp,ii) {
                if (!objComp.items) {
                    objReport.columns[i].components[ii].items = [];
                }
            });
        }
    });

    return objReport;
};


module.exports = new Report();
