'use strict';

/**
 * Module: MongoDriver
 * Description: Handles setting up the driver for MongoDB
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var mongodb = require('mongodb');
var fs = require('fs');
//________END Package Dependencies_________\\
//##########################################\\


//_______________________________________\\
//----====|| Local Dependencies ||====----\\
var app_config = require('../config/app.json');
var locales = require('../config/locales.json');
var logger = require('../modules/logger');
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
};

MongoDriver.prototype.init = function(program) {

    var self = this;
    var MONGO_URL = env_config.drivers.mongo.conn_url;
    var MongoClient = mongodb.MongoClient;
    var MongoConn;

    MongoClient.connect(MONGO_URL, function(err, db, callback) {
          if (err) {
                logger.log(logger.ERROR, localization.mongo.no_conn);
                process.exit(-1);
          } else {
              logger.log(logger.INFO, localization.mongo.conn);
          }

          MongoConn = db;

          for (var db_table in self.collections) {
              self.collections[db_table] = MongoConn.collection(db_table);
          }

        if (program.seed) {
            logger.log(logger.INFO, localization.mongo.seeding);

            var seeders = env_config.seeders;
            
            for (var seeder in seeders) {
                console.log('SEED: ', env_config.paths.seeders + seeders[seeder]);
                MongoConn.collection(seeder).insert(JSON.parse(fs.readFileSync(env_config.paths.seeders + seeders[seeder])), function(){});
            }
        }
    });
};


module.exports = new MongoDriver();
