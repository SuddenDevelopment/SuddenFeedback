
/**
 * Module: Util
 *
 * Description:
 */

//_________________________________________\\
//----====|| Package Dependencies ||====----\\
var _ = require('lodash');
//________END Package Dependencies_________\\
//##########################################\\


/**
 * Class ReportItemUtil
 */
function ReportItemUtil() {}

ReportItemUtil.prototype.getIndex = function(arr, key, value) {
    for (i = 0; i < arr.length; i += 1) {
        if (arr[i][key] === value) {
            delete arr; // What is happening here? This triggers an error in strict mode.
            return i;
        }
    }

    return false;
};

ReportItemUtil.prototype.sortArray = function(arrItems, strProp) {
    return _.sortBy(arrItems, function (obj) {
        return obj[strProp];
    });
};

ReportItemUtil.prototype.normalizeItem = function(objItem){

    //this is a generc normaile, not specific to any feed coming in
    if (!objItem.typ) { objItem.typ = 'item'; }

    if (objItem.text) { objItem.text = this.cleanText(objItem.text, {}); }else{ objItem.text=''; }

    if (!objItem.created_at) { objItem.created_at = (new Date).getTime(); }
    if (!objItem.updated_at) { objItem.updated_at = (new Date).getTime(); }
    if (!objItem.analysis) { objItem.analysis = {}; };

    // Reduce to only needed properties
    objItem = _.pick(objItem, ['title','text','typ','created_at','updated_at','column','analysis','priority','img','link','entities','user']);

    return objItem;
};


ReportItemUtil.prototype.cleanText = function(strSubject, objOptions) {

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


module.exports = new ReportItemUtil();
