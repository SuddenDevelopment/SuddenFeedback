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


module.exports = new MongoDriver();
