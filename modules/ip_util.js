/**
 * Module: IpUtil
 * Description: Provides utilities for working with IP addresses
 * Last Modified: 10-11-2014 by Andrew Forth
 */

var _ = require('lodash');
var os = require('os');

/**
 * Class IpUtil
 */
var IpUtil = function() {};

/**
 * Returns the host IP address if on eth0 else returns loopback
 */
IpUtil.prototype.getIpAddress = function(){
    var interfaces = [];
    var osInterfaces = os.networkInterfaces();
    //this needs a conditional before setting, or else it fails when not found. -ant
    //var objInterface = _.find(osInterfaces.eth0[0],{'family':'IPv4'});
    var strHost='localhost';

    for (key in osInterfaces) {
        interfaces.push(key);
    }

    if (_.contains(interfaces,'eth0')) {
        if (objInterface) {
            strHost=objInterface.address;
        }
    } else if (_.contains(interfaces,'en0')) {
        var objInterface = _.find(os.networkInterfaces().en0[0].address,{'family':'IPv4'});
        if (objInterface) {
            strHost=objInterface.address;
        }
    } else {
        return 'localhost';
    }

    if (strHost=='127.0.0.1') {
        return 'localhost';
    } else {
        return strHost;
    }
};

module.exports = new IpUtil();
