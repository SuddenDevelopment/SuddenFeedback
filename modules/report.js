/**
 * Module: Report
 * Description: Generates reports
 * Last Modified: 10-12-2014 by Andrew Forth
 */

var _ = require('lodash');

/**
 * Class Report
 */
var Report = function() {};

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
