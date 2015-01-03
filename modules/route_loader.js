'use strict';

/**
 * Module: RouteLoader
 * Description: Loads routes common to the application
 */


/**
 * Class RouteLoader
 */
var RouteLoader = function() {

};

RouteLoader.prototype.load = function(app, share, fuiapi) {

    app.get('/login', function(req, res) {
        // The first time a user visits we give them a unique ID to track them with
        if (!req.session.uuid) {
            req.session.uuid = uuid.v4();
        }
        res.render('login');
    });

    app.get('/logout', function(req, res) {
        if (req.session.uuid) {
            fuiapi.destroyStreams(req, res, true);
            share.set(null, 'user', req.session.uuid);
            share.set(null, 'report', req.session.uuid);
            share.set(null, 'twitter_auth', req.session.uuid);
            share.set(null, 'twitData', req.session.uuid);
            share.set(null, 'twit', req.session.uuid);
            share.set(null, 'socket_channel', req.session.uuid);
            req.session.uuid = null;
            req.session = null;
        }
        res.redirect('login');
    });

    // The page for managing reports without running them
    app.get('/home', function(req, res) {
        var self = this;
        res.render('home', { title: 'SuddenFeedback' });
    });

    //
    app.get('/', function(req, res, next) {
        fuiapi.loadIndex(req, res);
    });
};


module.exports = new RouteLoader();
