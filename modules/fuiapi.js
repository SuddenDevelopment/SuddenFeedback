/**
 * Module: FUIAPI
 * Description: Serves as the primary API for the client app
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
var reportHandler = require('./report');
var logger = require('./logger');
//________END Local Dependencies_________\\
//########################################\\


//____________________________\\
//----====|| Helpers ||====----\\
var env_config = app_config.env_config[app_config.env];
var localization = locales[app_config.lang];
var debug = env_config.debug;
//________END Helpers_________\\
//#############################\\


/**
 * Class FUIAPI
 */
var FUIAPI = function() {
    this.share = null;
    this.drivers = {};
    this.controllers = {};
};

FUIAPI.prototype.init = function(req, res, next) {
    var self = this;
    //get the report settings, if multiple grab the users most recent
    var objReport = self.share.get('report');

    if (objReport) {
        res.send(objReport);
    } else {
        console.log('FUIAPI INIT: ', self.drivers.mongo);
        //console.log('load a default report');
        self.drivers.mongo.collections['reports'].findOne({}, function(err, report) {
            objReport = reportHandler.normalize(report);
            self.share.set(objReport, 'report');
            res.send(objReport);
        });
        //get the word sets used
   }
};

FUIAPI.prototype.config = function(app, share, drivers, controllers) {
    var self = this;

    self.share = share;
    self.drivers = drivers;
    self.controllers = controllers;

    self.loadRoutes(app);
};

// @Todo - Eventually get more RESTful with route handling
FUIAPI.prototype.loadRoutes = function(app) {
    var self = this;

    app.get('/', function(req, res, next) {
        var data_type = req.param('t', null);

        if (!data_type) {
            console.log('Data type not specified. This is okay when the page first loads.');
            data_type = env_config.default_data_provider;
        }

        self.controllers[data_type].index(req, res);
    });

    app.post('/fuiapi', function(req, res, next) {
      var action = req.param('a', null);

      if (self[action]) {
          try {
              self[action](req, res, next);
          } catch (e) {

              logger.log(logger.ERROR, 'FUIAPI has thrown an error', e);

              res.status(500);

              if (e.safeMessage) {
                  res.send({error: e.safeMessage});
              } else {
                  res.send('An error has occurred');
              }
          }

      } else {
          res.status(400);
          res.send('error');
      }
    });
};

// @Todo - eventually we will want more granular permissions than just if
// the user has authenticated with the data provider. For instance, perhaps they
// should only have limited access / capabilities with a particular data provider.
FUIAPI.prototype.authorize = function(req, data_type) {
    var self = this;

    // @Todo - this currently does not authorize on a per action basis. It merely
    // checks that the user has authenticated in general with the data provider.
    if (!self.controllers[data_type].authorizeAction(req)) {
        throw {
            safeMessage: localization.common.not_authorized_for_type + ": " + data_type
        };
    }
};

// GET / POST stream
FUIAPI.prototype.playStream = function(req, res, next) {
    var self = this;
    var data_type = req.param('t', null);

    self.authorize(req, data_type);

    self.controllers[data_type].connectStream(req, res, next);
};

// DELETE stream
FUIAPI.prototype.pauseStream = function(req, res, next) {
    var self = this;
    var data_type = req.param('t', null);

    self.authorize(req, data_type);

    self.controllers[data_type].destroyStream(req, res, next);
};

// GET many reports
FUIAPI.prototype.listReports = function(req, res, next) {
    var self = this;
    var data_type = req.param('t', null);

    self.authorize(req, data_type);

    self.drivers.mongo.collections['reports'].find({},{ columns: 0, terms: 0 }).toArray(function(err, results) {
        res.send({ reportList: results });
    });
};

// GET one report
FUIAPI.prototype.loadReport = function(req, res, next) {
    var self = this;
    var data_type = req.param('t', null);

    self.authorize(req, data_type);

    var report = {};
    var d = req.param('q', null); //console.log(d);
    self.drivers.mongo.collections['reports'].findOne({ _id: d }, function(err, report) {
        report = reportHandler.normalize(report);
        self.share.set(report, 'report');
        res.send(report);
    });
};

// DELETE report
FUIAPI.prototype.delReport = function(req, res, next) {
    var self = this;
    var data_type = req.param('t', null);

    self.authorize(req, data_type);

    var report = {};
    var d = req.param('q', null); //console.log(d);
    self.drivers.mongo.collections['reports'].remove({ _id: d }, function(err, response) {
        res.send('report deleted');
    });
};

// PUT / POST report
FUIAPI.prototype.saveReport = function(req, res, next) {
    var self = this;
    var d = req.param('q', null);
    var data_type = req.param('t', null);

    self.authorize(req, data_type);

    self.drivers.mongo.collections['reports'].update({ _id: d._id }
        , { columns: d.columns, terms: d.terms, name: d.name, colSort: d.colSort, titles: d.titles}
        , { upsert: true, safe: true }
        , function(err, data) {
            if (err) {
                res.send('error');
            } else {
                res.send('success');
            }
        }
    );

    self.share.set(d, 'report');
    //todo: save to session for server side use
};

// PUT / POST terms
FUIAPI.prototype.saveTerms = function(req, res, next) {
    var self = this;
    var d = req.param('q', null);
    var data_type = req.param('t', null);

    self.authorize(req, data_type);

    for (var i = 0; i < d.length; i += 1) {
        self.drivers.mongo.collections['terms'].update({ _id: d[i].user + ':' + d[i].name }
            , { user: d[i].user, name: d[i].name, terms: d[i].terms }
            , { upsert: true, safe: true }
            , function(err, data) {
                if (err) {
                    res.send('error');
                } else {
                    res.send('success');
                }
            }
        );
    }
};


module.exports = new FUIAPI();
