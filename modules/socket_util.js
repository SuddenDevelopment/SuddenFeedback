'use strict';

/**
 * Module: SocketUtil
 * Description: Socket utility methods.
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var _ = require('lodash');
//________END Package Dependencies_________\\
//##########################################\\


/**
 * Class SocketUtil
 */
function SocketUtil() {}

SocketUtil.prototype.sendMessage = _.debounce(function(arrItems, io) {
    if (arrItems.length > 0) {
        io.sockets.emit('newItems', arrItems);
        return true;
    }
}, 100, { 'maxWait': 500 });

module.exports = new SocketUtil();
