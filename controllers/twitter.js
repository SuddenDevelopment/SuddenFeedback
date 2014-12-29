'use strict';

/**
 * Module: TwitterController
 * Description: Handles execution of routes related to Twitter
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var twitter = require('ntwitter');
var OAuth = require('oauth').OAuth;
var sentiment = require('sentiment');
var uuid = require('node-uuid');
var _ = require('lodash');
var socket_io = require('socket.io')
//________END Package Dependencies_________\\
//##########################################\\


//_______________________________________\\
//----====|| Local Dependencies ||====----\\
var app_config = require('../config/app.json');
var locales = require('../config/locales.json');
var logger = require('../modules/logger');
var util = require('../modules/util');
var ip_util = require('../modules/ip_util');
var twitter_util = require('../modules/twitter_util');
var socket_util = require('../modules/socket_util');
//________END Local Dependencies_________\\
//########################################\\


//____________________________\\
//----====|| Helpers ||====----\\
var env_config = app_config.env_config[app_config.env];
var localization = locales[app_config.lang];
var debug = env_config.debug;
var host_ip = ip_util.getIpAddress();
var port = process.env.PORT || env_config.ports.app;
//________END Helpers_________\\
//#############################\\


//__________________________________\\
//----====|| Instance Vars ||====----\\
var io = socket_io.listen(env_config.ports.socket, { log: false });
var torfSentiment = false;
var strNeedle = null;
//________END Instance Vars_________\\
//###################################\\


/**
 * Class TwitterController
 */
var TwitterController = function() {
    this.share = null;
    this.drivers = {};
    this.auth = null;
    this.credentials = {};
};

TwitterController.prototype.init = function(program, app, share, drivers) {
    var self = this;
    var protocol = program.protocol || env_config.protocol;

    self.share = share;
    self.drivers = drivers;

    self.loadRoutes(app);

    twitter_util.getCredentials((program.auth || env_config.auth.default), function (creds) {
        self.credentials = creds;

        // @Todo - Does this need to be segregated by user?
        self.share.set(self.credentials, 'twitter_credentials');

        /*
         * GET home page.
              consumer_key: '9kFmLFgQw25ls1lvY4VLHCpDN',
            consumer_secret: 'qyw9KEhgqMBSXvEZJhwLXvUyMiFtRKbArPSxxW1b97V0A6qUT3',
            access_token: '961522914-MYbXA2PLITQplMieKLje0zP0L3ddad1FN8xFKMUY',
            access_token_secret: '2N3WH09m2la6q7xMKzKc34ZWq9ySgypqbxreGnYPGTJ5J'
         */
        self.auth = new OAuth(
            //env_config.data_providers.twitter.auth.request_token_url,
            //env_config.data_providers.twitter.auth.access_token_url,
            env_config.auth.request_token_url,
            env_config.auth.access_token_url,
            self.credentials.api_key,
            self.credentials.api_secret,
            //env_config.data_providers.twitter.auth.version,
            env_config.auth.version,
            protocol + "://" + host_ip + ":"+ port + '/auth/twitter/callback',
            //env_config.data_providers.twitter.auth.mac_type
            env_config.auth.mac_type
        );
    });
};

TwitterController.prototype.loadRoutes = function(app) {
    var self = this;
    app.get('/auth/twitter', self.authUser.bind(self));
    app.get('/auth/twitter/callback', self.authUserCallback.bind(self));
    app.get('/home', self.home.bind(self));
};

// @Todo - this currently does not authorize on a per action basis. It merely
// checks that the user has authenticated in general with the data provider.
TwitterController.prototype.authorizeAction = function(req) {
    var self = this;

    // @Todo - don't restrict actions for now
    return true;
    return self.share.get('twitter_auth', req.session.uuid);
};

TwitterController.prototype.authUser = function(req, res) {
    var self = this;

    self.auth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
        if (error) {
            logger.log(logger.ERROR, error);
            res.send(localization.oauth.no_request_token);
        } else {
            self.share.set({
                "oauth_token": oauth_token,
                "oauth_token_secret": oauth_token_secret
            }, 'twitter_auth', req.session.uuid);

            //res.redirect(env_config.data_providers.twitter.auth.url_prefix + oauth_token);
            res.redirect(env_config.auth.url_prefix + oauth_token);
        }
    });
};

TwitterController.prototype.authUserCallback = function(req, res, next) {
    var self = this;
    var oauth = self.share.get('twitter_auth', req.session.uuid);

    if (oauth) {
        oauth.oauth_verifier = req.query.oauth_verifier;

        self.auth.getOAuthAccessToken(oauth.oauth_token, oauth.oauth_token_secret, oauth.oauth_verifier,
            function(error, oauth_access_token, oauth_access_token_secret, results) {

                if (error) {
                    console.log(error);
                    res.send(localization.oauth.access_token_error);
                } else {
                    oauth.access_token = oauth_access_token;
                    oauth.access_token_secret = oauth_access_token_secret;
                    self.share.set(oauth, 'twitter_auth', req.session.uuid);

                    var twit = new twitter({
                        consumer_key: self.credentials.api_key,
                        consumer_secret: self.credentials.api_secret,
                        access_token_key: oauth.access_token,
                        access_token_secret: oauth.access_token_secret
                    });

                    twit.verifyCredentials(function(err, twitterUser) {
                        if (err) {
                            logger.log(logger.ERROR, localization.twitter.auth_failure, err);
                        } else {
                            logger.log(logger.DEBUG, localization.twitter.auth_success, twitterUser);

                            var query = {
                                _id: 'twitter_' + twitterUser.id
                            };

                            // Grab the local user account that's associated with the Twitter result
                            self.drivers.mongo.collections['users'].findOne({_id: 'twitter_' + twitterUser.id}, function(err, user) {
                                if (err) {
                                    logger.log(logger.ERROR, err);
                                }

                                if (user) {
                                    self.share.set(user, 'user', req.session.uuid);
                                } else {
                                    var newUser = {
                                        _id: 'twitter_' + twitterUser.id,
                                        vendor_id: twitterUser.id,
                                        vendor_type: 'twitter',
                                        name: twitterUser.name,
                                        screen_name: twitterUser.screen_name,
                                        url: twitterUser.url,
                                        lang: twitterUser.lang,
                                        utc_offset: twitterUser.utc_offset,
                                        time_zone: twitterUser.time_zone
                                    };

                                    self.drivers.mongo.collections['users'].save(newUser, function(err, newRecord) {
                                        if (err) {
                                            logger.log(logger.ERROR, err);
                                        }

                                        if (newRecord) {
                                            self.share.set(newUser, 'user', req.session.uuid);
                                        }
                                    });
                                }
                            });

                            res.redirect('/');
                        }
                    });
                }
            }
        );
    } else {
        next(new Error(localization[app_config.lang].oath.unauthorized));
    }
};

TwitterController.prototype.connectStream = function(req, res, user) {
    var self = this;
    var oauth = self.share.get('twitter_auth', req.session.uuid);
    var twitData = self.share.get('twitData', req.session.uuid);
    var twit = self.share.get('twit', req.session.uuid);

    var arrItems = [];
    var objReport = self.share.get('report');

    if (twit && objReport) {
        //get the terms from the report used to track. Set in the report, will concat all terms that havf Fn==Find
        var terms2Track = [];
        //var userTerms = self.share.get('terms',req.session.uuid);

        //clean up the terms, the ttag module in the UI repaces spaces with -
        _.forEach(objReport.terms, function(objSet) {
            if (objSet.fn === 'Find') {
                _.forEach(objSet.terms, function(objTerm) {
                    terms2Track.push(objTerm.text.replace('-',' '));
                });
            }
        });

        //determine if sentiment analysis is needed, probably will be an array of analysis to run instead f individual torfs
        _.forEach(objReport.columns, function(objCol) {
            if (!torfSentiment
                && objCol.analysis
                && objCol.analysis.toLowerCase().indexOf('sentiment') !== -1
            ) {
                torfSentiment = true;
            }
        });

        // console.log(terms2Track);
        twit.stream('statuses/filter', { track: terms2Track }, function (stream) {
            self.share.set(stream,'stream', req.session.uuid);

            stream.on('error', function(error, code) {
                logger.log(logger.ERROR, "Stream error: " + error + ": " + code);
            });

            stream.on('data', function (objItem) {
                var torfSend = true;
                var filtered = false;

                if (objReport) {
                    var objOptions = {};

                    if (objReport.titles) {
                        objOptions.titles = objReport.titles;
                    }

                    objItem = self.twitter2Item(objItem, objOptions); //feed specific transform to an item
                    objItem = util.normalizeItem(objItem); //Normalize the Item

                 //_________________________________________\\
                //----====|| ADD ANALYSIS TO MESSAGE ||====----\\
                    //add sentiment analysis
                    if (torfSentiment) {
                        objItem.analysis.sentiment = sentiment(objItem.text).score;
                    }
                 //END ANALYSIS\\
                //##############\\

                    //loop through the root level term groups used
                    //Global Filter
                    _.forEach(objReport.terms, function(objSet) {
                        if (filtered === false && objSet.fn === 'Filter') {
                            var strMatch = self.firstTerm(objSet.terms, objItem.text);

                            if (strMatch) {
                                filtered = true;
                                objItem.analysis.filtered = strMatch;
                            };
                        }
                    });
                 //_____________________________________\\
                //----====|| SORT INTO COLUMNS ||====----\\
                    //go through columns in order, col order matters for sorting, some items will pass through and add to multiple columns, default is to stop when a col is found
                    var intColIndex = false;
                    for (i = 0; i < objReport.columns.length; i += 1) {
                        //the notes column is a special one when someone adds notes to items, those items show up in notes
                        if (objReport.columns[i].show.toLowerCase() === 'notes'
                            && objItem.analysis.filtered
                        ) {
                            arrItems.push({ column: objReport.columns[i].id, typ: 'Filter', text: objItem.analysis.filtered });
                        }
                        else if (objReport.columns[i].analysis === 'sentiment=positive'
                            && !objItem.analysis.filtered
                            && objItem.analysis.sentiment > 0
                        ) {
                            objItem.column = objReport.columns[i].id;
                        }
                        else if (objReport.columns[i].analysis === 'sentiment=negative'
                            && !objItem.analysis.filtered
                            && objItem.analysis.sentiment < 0
                        ) {
                            objItem.column = objReport.columns[i].id;
                        }
                        else if (objReport.columns[i].analysis ==='sentiment=neutral'
                            && !objItem.analysis.filtered
                            && objItem.analysis.sentiment === 0
                        ) {
                            objItem.column = objReport.columns[i].id;
                        }
                        else if (objReport.columns[i].show === 'ColumnTitle') {

                            strNeedle = objReport.columns[i].label.toLowerCase();

                            if (objItem.text.toLowerCase().indexOf(strNeedle) !== -1) {
                                objItem.column = objReport.columns[i].id;
                            }
                            else if (_.find(objReport.columns[i].hashtags, { 'text': strNeedle })) {
                                objItem.column = objReport.columns[i].id;
                            }
                            else if (_.find(objReport.columns[i].user_mentions, { 'screen_name': strNeedle })) {
                                objItem.column = objReport.columns[i].id;
                            }
                        }

                        if (objItem.column && objItem.analysis.filtered) {
                            arrItems.push({ column: objItem.column, typ: 'Filter', text: objItem.analysis.filtered });
                        } //add a per colum tag for filtered items

                        if (objItem.column && !intColIndex) {
                            intColIndex = i;
                        }
                    }

                    if (!objItem.column) {

                        intColIndex = util.getIndex(objReport.columns,'show','Orphans'); //special column to show items that dont have a home.

                        if (intColIndex) {
                            objItem.column = objReport.columns[intColIndex].id;
                        }
                    }
                 //END COLUMN SORTING\\
                //####################\\
                //__________________________________\\
                //----====|| STORE LOCALLY ||====----\\
                    var torfRT = false;
                    var intNow = (new Date).getTime();
                    var arrDelete = [];
                    if (objItem.column) {

                        _.forEach(objReport.columns[intColIndex]['items'], function(objI,k) {

                            if (objI.text === objItem.text) {
                                objI.updated_at = intNow;
                                //cumulative priority
                                if (objItem.priority < 2 || objItem.priority <= objI.priority) {
                                    objI.priority += 1;

                                }
                                else { //replacing priority
                                    objI.priority = objItem.priority;
                                }

                                torfRT = true;
                            }else{
                                //don't keep everything forever, not all data is sacred. Drop by age, order, frequency etc.
                                //if it hasnt been updated in an hour, and is below the priority threshold
                                if(objI.priority < 2 && intNow-objI.updated_at > 3600000){  arrDelete.push(k);  }
                            }
                        });

                        //need to do this outside the loop so that items aren't removed during the loop
                        _.forEach( arrDelete,function(k){
                            objReport.columns[intColIndex]['items'].splice(k,1);
                        });

                        if (torfRT === false) {
                            //add
                            objReport.columns[intColIndex]['items'].unshift(objItem);

                            //sort the column
                            objReport.columns[intColIndex]['items'] = util.sortArray(objReport.columns[intColIndex]['items'], objReport.columns[intColIndex].sort);

                            //make sure it's high enough sort order to send to browser
                            if (util.getIndex(objReport.columns[intColIndex]['items'], 'id', objItem.id) > objReport.columns[intColIndex].limit) {
                                torfSend = false;
                            }


                        }
                    }
                    //when this is triggered no column was assigned, if it happens too often something is wrong
                    else if (debug === true) {
                        console.log('column: ' + objItem.column + "\n" + objItem.text + "\n \n");
                    }
                //END LOCAL STORAGE\\
                //##################\\

                    //SEND IT TO THE Browser WEBSOCKET
                    if (torfSend && objItem.column > 0) {

                        if (!objItem.analysis.filtered) {
                            arrItems.push(objItem);
                        }

                        //add stats
                        if ( _.find(objReport.columns[intColIndex].components, {'typ': 'Stats'})
                            || _.find(objReport.columns[intColIndex].components, {'typ': 'Link'})
                        ) {
                            for (var i = 0; i < objItem.entities.urls.length; i += 1) {
                                arrItems.push({ column: objItem.column, typ: 'Link', text: objItem.entities.urls[i].expanded_url.toLowerCase() });
                            }
                        }
                        if ( _.find(objReport.columns[intColIndex].components, {'typ':'Stats'})
                            || _.find(objReport.columns[intColIndex].components, {'typ':'Mention'})
                        ) {
                            for (var i = 0; i < objItem.entities.user_mentions.length; i += 1){
                                arrItems.push({ column: objItem.column, typ: 'Mention', text: objItem.entities.user_mentions[i].screen_name.toLowerCase() });
                            }
                        }

                        if ( _.find(objReport.columns[intColIndex].components, {'typ': 'Stats'})
                            || _.find(objReport.columns[intColIndex].components, {'typ': 'User'})
                        ) {
                            arrItems.push({ column: objItem.column, typ:'User', text: objItem.user.screen_name });
                        }

                        if ( _.find(objReport.columns[intColIndex].components, {'typ':'Stats'})
                            || _.find(objReport.columns[intColIndex].components, {'typ':'Tag'})
                        ) {
                            for (var i = 0; i < objItem.entities.hashtags.length; i += 1) {
                                arrItems.push({ column: objItem.column, typ: 'Tag', text: objItem.entities.hashtags[i].text.toLowerCase() });
                            }
                        }
                    }
                    else if (debug === true) {
                        console.log('column: ' + objItem.column + "\n" + objItem.text);
                    }

                    var torfSent = socket_util.sendMessage(arrItems, io);

                    //clear the queue on success
                    if (torfSent) {
                        arrItems = [];
                    }
                }
            });
        }); //end stream
    }
};

TwitterController.prototype.destroyStream = function(req, res) {
    var self = this;
    var stream = self.share.get('stream', req.session.uuid);

    if (!stream) {
        console.log('stream', stream);
        res.send('error'); return;
        return;
    }

    stream.destroy();

    res.send('success');
};

TwitterController.prototype.twitter2Item = function(objItem, objOptions) {

    objItem.priority = 1; //start priority if it's not retweeted

    //replace data with retweet data because they are redundant
    if (objOptions.titles && objOptions.titles === 'user') {
        objItem.title = objItem.user.screen_name;
    }

    if (objItem.retweeted_status !== undefined) {
        if (objItem.retweeted_status.retweet_count > 0) {
            objItem.priority += objItem.retweeted_status.retweet_count;
            objItem.entities = objItem.retweeted_status.entities;
        }
    }

    return objItem;
};

TwitterController.prototype.firstTerm = function(arrNeedles, strHaystack) {

    //console.log(arrNeedles);

    //find the first term that matches and return it, return false if none found.
    var strMatch = false;

    for (var y = 0; y < arrNeedles.length; y++) {

        //console.log(arrNeedles[y]);

        if (arrNeedles[y].hasOwnProperty('text')) {
            strNeedle = arrNeedles[y].text.toLowerCase();
        } else {
            strNeedle = arrNeedles[y].toLowerCase();
        }

        if (strMatch === false && strHaystack.toLowerCase().indexOf(strNeedle) !== -1) {
            strMatch = strNeedle;
        }
    }
    return strMatch;
};

TwitterController.prototype.allTerms = function(arrNeedles, strHaystack) {

    arrMatches = [];

    for (var y = 0; y < arrNeedles.length; y++) {
        if (arrNeedles[y].hasOwnProperty('text')) {
            strNeedle = arrNeedles[y].text.toLowerCase();
        } else {
            strNeedle = arrNeedles[y].toLowerCase();
        }

        if (strHaystack.toLowerCase().indexOf(strNeedle) !== -1) {
            arrMatches.push(strNeedle);
        }
    }

    return arrMatches;
};

//_________________________\\
//----====|| MAIN ||====----\\
TwitterController.prototype.home = function(req, res) {
    var self = this;
    res.render('home', { title: 'SuddenFeedback' }); //the page for mamaging reports without running them
}
TwitterController.prototype.index = function(req, res) {
    var self = this;
    //console.log(req.session.term);

    // The first time a user visits we give them a unique ID to track them with
    if (!req.session.uuid) {
        req.session.uuid = uuid.v4();
    }

    var oauth = self.share.get('twitter_auth', req.session.uuid);
    var twitData = self.share.get('twitData', req.session.uuid);
    var twit = self.share.get('twit', req.session.uuid);

    if (!oauth) {
        res.redirect('/login');
    }

    if (oauth && !twitData && !twit) {
        //console.log('no twitData, getting it', oauth);

        twit = new twitter({
            consumer_key: self.credentials.api_key,
            consumer_secret: self.credentials.api_secret,
            access_token_key: oauth.access_token,
            access_token_secret: oauth.access_token_secret
        });

        twit.verifyCredentials(function (err, data) {
            if (err) {
                logger.log(logger.ERROR, 'getting twitData failed!', err);
                res.redirect('/login');
            } else {
                twitData = data.id;
                self.share.set(twitData,'twitData', req.session.uuid);
                self.share.set(twit,'twit', req.session.uuid);

                var user = self.share.get('user', req.session.uuid);
                
                if (!user) {
                    res.redirect('/login');
                }

                res.render('index', { title: 'SuddenFeedback' });
                self.connectStream(req, res, user);
            }
        });
    } else {
        res.render('index', { title: 'SuddenFeedback' });
    }
};
//________END MAIN_________\\
//##########################\\


module.exports = new TwitterController();
