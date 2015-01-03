'use strict';

/**
 * Module: MongoDriver
 * Description: Handles setting up the driver for MongoDB
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var mongodb = require('mongodb');
var fs = require('fs');
var async = require('async');
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

MongoDriver.prototype.init = function(share, seed) {

    var self = this;
    self.share = share;

    var mongoUrl = env_config.drivers.mongo.conn_url;
    var mongoClient = mongodb.MongoClient;

    mongoClient.connect(mongoUrl, function(err, db) {

        if (err) {
            logger.log(logger.ERROR, localization.mongo.no_conn);
            process.exit(1);
        } else {
            logger.log(logger.INFO, localization.mongo.conn);
        }

        var collectionFuncs = {};

        for (var key in self.collections) {
            (function(collectionName) {
                collectionFuncs[collectionName] = function(callback) {

                    self.collections[collectionName] = db.collection(collectionName);

                    // Ensure that
                    if ('users' === collectionName) {

                        // Index on the unique id provided by a particular vendor
                        // Ex. {
                        //     vendor_id: 25764310,
                        //     vendor_type: 'twitter'
                        // }
                        self.collections[collectionName].ensureIndex({
                                vendor_id:1,
                                vendor_type:1
                            }
                            , {unique:true, background:true, w:1}
                            , function(err, indexAuthId) {

                                // Index on the user screen name
                                self.collections[collectionName].ensureIndex({
                                        screen_name:1
                                    }
                                    , {unique:true, background:true, w:1}
                                    , function(err, indexScreenName) {
                                        callback(null, self.collections[collectionName]);
                                    }
                                );
                            }
                        );
                    } else {
                        callback(null, self.collections[collectionName]);
                    }
                };
            })(key);
        }

        async.parallel(collectionFuncs, function(err, collections) {
            if (seed) {
                var seeders = env_config.seeders;
                console.log('SEEDING:', seeders);
                console.log('collections: ', self.collections);


                for (var collectionToSeed in seeders) {
                    console.log('ATTEMPT TO SEED: ', collectionToSeed);
                    var seedObjects = JSON.parse(fs.readFileSync(env_config.paths.seeders + seeders[collectionToSeed]));

                    for (var i = 0; i < seedObjects.length; i += 1) {
                        self.collections[collectionToSeed].insert(seedObjects[i], function(){});
                    }
                }
            }
        });
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
            if (user.reports === [] || !user.default_report_id) {
                self.addDefaultReportsToUser(req, user, function() {
                    self.share.set(user, 'user', req.session.uuid);
                    callback();
                });
            } else {
                for (var i = 0; i < user.reports.length; i += 1) {
                    if (user.reports[i]._id === user.default_report_id) {
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

                self.share.set(newUser, 'user', req.session.uuid);

                self.addDefaultReportsToUser(req, newUser, function() {
                    self.share.set(newUser, 'user', req.session.uuid);
                    callback();
                });
            });
        }
    });
};

MongoDriver.prototype.addDefaultReportsToUser = function(req, user, callback) {
    var self = this;

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
                    user.default_report_id = report._id;
                    self.share.set(report, 'report', req.session.uuid);
                }
            }

            if (!user.default_report_id && user.reports.length > 0) {
                user.default_report_id = user.reports[0]._id;
                self.share.set(user.reports[0], 'report', req.session.uuid);
            }

            self.collections['users'].save(user, {w: 1}, function(err, newRecord) {
                callback();
            });
        }
    });
};

module.exports = new MongoDriver();
