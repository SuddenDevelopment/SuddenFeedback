'use strict';

/**
 * Module: MongoDriver
 * Description: Handles setting up the driver for MongoDB
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var fs = require('fs');
//________END Package Dependencies_________\\
//##########################################\\


//_______________________________________\\
//----====|| Local Dependencies ||====----\\
var app_config = require('../config/app.json');
var locales = require('../config/locales.json');
var logger = require('../modules/logger');
var reportHandler = require('../modules/report');
//________END Local Dependencies_________\\
//########################################\\


//____________________________\\
//----====|| Helpers ||====----\\
var env_config = app_config.env_config[app_config.env];
var localization = locales[app_config.lang];
//________END Helpers_________\\
//#############################\\


/**
 * Class MongoDriver
 */
var MongoDriver = function() {
    this.collections = {
        users: null,
        reports: null,
        terms: null
    };

    this.share = null;
};

MongoDriver.prototype.init = function(program, share) {

    var self = this;
    self.share = share;

    var mongo_url = env_config.drivers.mongo.conn_url;
    var mongo_client = mongodb.MongoClient;
    var mongo_conn;

    mongo_client.connect(mongo_url, function(err, db, callback) {
          if (err) {
                logger.log(logger.ERROR, localization.mongo.no_conn);
                process.exit(-1);
          } else {
              logger.log(logger.INFO, localization.mongo.conn);
          }

          mongo_conn = db;

          for (var db_table in self.collections) {
              self.collections[db_table] = mongo_conn.collection(db_table);
          }

        if (program.seed) {
            logger.log(logger.INFO, localization.mongo.seeding);

            var seeders = env_config.seeders;

            for (var seeder in seeders) {
                var seed_objects = JSON.parse(fs.readFileSync(env_config.paths.seeders + seeders[seeder]));

                for (var i = 0; i < seed_objects.length; i += 1) {
                    mongo_conn.collection(seeder).insert(seed_objects[i], function(){});
                }
            }
        }
    });
};

MongoDriver.prototype.loadUser = function(req, userQuery, newUser, callback) {
    var self = this;

    self.collections['users'].findOne(userQuery, function(err, user) {
        if (err) {
            logger.log(logger.ERROR, err);
            callback();
            return;
        }

        if (user) {
            console.log('User found: ', user);

            if (user.reports === [] || !user.default_report_id) {

                self.addDefaultReportsToUser(req, user, function() {
                    self.share.set(user, 'user', req.session.uuid);
                    callback();
                });

                /*
                self.collections['reports'].find({name: "Celebrity"}, function(errReport, report) {
                    if (errReport) {
                        logger.log(logger.ERROR, errReport);
                    } else {
                        report = reportHandler.normalize(report);

                        user.reports = [];
                        user.default_report_id = report._id;
                        user.reports.push(report);

                        self.collections['users'].save(user);
                        self.share.set(report, 'report', req.session.uuid);
                    }
                });*/
            } else {
                for (var i = 0; i < user.reports.length; i += 1) {
                    if (user.reports[i]._id === user.default_report_id) {
                        console.log('SETTING REPORT FOR USER TO: ', user.reports[i]);
                        self.share.set(user.reports[i], 'report', req.session.uuid);
                    }
                }

                self.share.set(user, 'user', req.session.uuid);

                callback();
            }

        } else {
            self.collections['users'].save(newUser, {w: 1}, function(err, newRecord) {
                if (err) {
                    logger.log(logger.ERROR, err);
                    callback();
                    return;
                }

                console.log('New User created: ', newUser);
                self.share.set(newUser, 'user', req.session.uuid);

                self.addDefaultReportsToUser(req, newUser, function() {
                    self.share.set(newUser, 'user', req.session.uuid);
                    callback();
                });

                /*
                self.drivers.mongo.collections['reports'].find({_id: "Celebrity"}, function(errReport, report) {
                    if (errReport) {
                        logger.log(logger.ERROR, errReport);
                    } else {
                        report = reportHandler.normalize(report);

                        newUser.reports = [];
                        newUser.default_report_id = report._id;
                        newUser.reports.push(report);

                        self.collections['users'].save(newUser);
                        self.share.set(report, 'report');
                    }
                });
                */

                //callback();
            });
        }
    });
};

MongoDriver.prototype.addDefaultReportsToUser = function(req, user, callback) {
    var self = this;

    console.log('Adding default reports to user: ', user);

    self.collections['reports'].find({visibility: "public", owner: "suddenfeedback"}).toArray(function(errReport, reports) {

        if (errReport) {
            logger.log(logger.ERROR, errReport);
            callback();
            return;
        } else {
            var report;

            for (var i = 0; i < reports.length; i += 1) {
                report = reportHandler.normalize(reports[i]);

                report.owner = user.screen_name;
                report.visibility = "private";

                user.reports.push(report);

                if (env_config.default_report_id === report._id) {
                    console.log('REPORT ID MATCHES CONFIGURED DEFAULT: ', report._id);
                    user.default_report_id = report._id;
                    self.share.set(report, 'report', req.session.uuid);
                }
            }

            if (!user.default_report_id && user.reports.length > 0) {
                user.default_report_id = user.reports[0]._id;
                console.log('SETTING REPORT in last ditch');
                self.share.set(user.reports[0], 'report', req.session.uuid);
            }

            self.collections['users'].save(user, {w: 1}, function(err, newRecord) {
                callback();
            });
        }
    });
};

module.exports = new MongoDriver();
