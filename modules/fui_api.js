/**
 * Module: FuiApi
 * Description: Servers as the primary API for the client app
 * Last Modified: 10-11-2014 by Andrew Forth
 */

var fs = require('fs');
var app_config = require('../config/app.json');
var share = require('./share'); //utility wes wrote for data betwen node files instead of session
var reportHandler = require('./report');
var logger = require('./logger');

/**
 * Class FuiApi
 */
var FuiApi = function() {
    this.routes = null;
    this.collections = {};
};

FuiApi.prototype.init = function(req, res, next) {
    //get the report settings, if multiple grab the users most recent
    var objReport = share.get('report');

    if (objReport) {
        res.send(objReport);
    } else {
        //console.log('load a default report');
        this.collections['reports'].findOne({}, function(err, report) {
            objReport = reportHandler.normalize(report);
            share.set(objReport, 'report');
            res.send(objReport);
        });
        //get the word sets used
   }
};

FuiApi.prototype.config = function(routes, collections) {
    this.routes = routes;

    //todo: save to session for server side use
    this.playStream = this.routes.connectStream;
    this.pauseStream = this.routes.destroyStream;

    this.collections = collections;
};

FuiApi.prototype.listReports = function(req, res, next) {
    this.collections['reports'].find({},{ columns: 0, terms: 0 }).toArray(function(err, results){
        res.send({ reportList: results });
    });
};

FuiApi.prototype.loadReport = function(req, res, next) {
    var report = {};
    var d = req.param('q', null); //console.log(d);
    this.collections['reports'].findOne({ _id:d }, function(err, report) {
        report = reportHandler.normalize(report);
        share.set(report, 'report');
        res.send(report);
    });
};

FuiApi.prototype.delReport = function(req, res, next) {
    var report = {};
    var d = req.param('q', null); //console.log(d);
    this.collections['reports'].remove({ _id: d }, function(err, response) {
        res.send('report deleted');
    });
};

FuiApi.prototype.saveReport = function(req, res, next) {
    var d = req.param('q', null);

    this.collections['reports'].update({ _id:d._id }
        , { columns: d.columns, terms: d.terms, name: d.name, colSort: d.colSort, titles: d.titles}
        , { upsert: true, safe: true }
        , this.sendErrorSuccess);

    share.set(d,'report');
    //todo: save to session for server side use
};

FuiApi.prototype.saveTerms = function(req, res, next) {
    var d = req.param('q', null);

    for (var i=0; i<d.length;i++) {
        this.collections['terms'].update({ _id: d[i].user + ':' + d[i].name }
            , { user: d[i].user, name: d[i].name, terms: d[i].terms }
            , { upsert:true,safe:true }
            , this.sendErrorSuccess);
    }
};

FuiApi.prototype.sendErrorSuccess = function(err, data) {
    if (err) {
        res.send('error');
    } else {
        res.send('success');
    }
};

module.exports = new FuiApi();
