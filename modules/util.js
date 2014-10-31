
/**
 * Module: Util
 *
 * Description: Miscellaneous utility methods. These should be split up into
 * utility classes that have actual semantic meaning, i.e. utils/array.js,
 * utils/normalize.js, etc.
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var _ = require('lodash');
//________END Package Dependencies_________\\
//##########################################\\


/**
 * Class Util
 */
function Util() {}

Util.prototype.getIndex = function(arr, key, value) {
    for (i = 0; i < arr.length; i += 1) {
        if (arr[i][key] === value) {
            delete arr; // What is happening here? This triggers an error in strict mode.
            return i;
        }
    }

    return false;
};

Util.prototype.sortArray = function(arrItems, strProp) {
    return _.sortBy(arrItems, function (obj) {
        return obj[strProp];
    });
};

Util.prototype.normalizeItem = function(objItem){

    //this is a generc normaile, not specific to any feed coming in
    if (!objItem.typ) { objItem.typ = 'item'; }

    if (objItem.text) { objItem.text = this.cleanText(objItem.text, {}); }

    if (!objItem.created_at) { objItem.created_at = (new Date).getTime(); }

    if (!objItem.analysis) { objItem.analysis = {}; };

    // Reduce to only needed properties
    objItem = _.pick(objItem, ['title','text','typ','created_at','updated_at','column','analysis','priority','img','link','entities','user']);

    return objItem;
};


Util.prototype.cleanText = function(strSubject, objOptions) {

    //REMOVE THE 1ST RT
    if (strSubject.substr(0,2) == 'RT') {
        strSubject = strSubject.replace('RT ', '');
    }

    //data.urls = data.text.match(/http[s]?:\S*/g); //should be in the entiites object already
    strSubject = strSubject.replace(/http[s]?:\S*/g, '');

    //REMOVE SOME NAMES
    strSubject = strSubject.replace(/@\S*\s/, '');

    return strSubject;
};


module.exports = new Util();
