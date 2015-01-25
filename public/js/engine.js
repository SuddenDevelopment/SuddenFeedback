
//shim function to get the index by a key/value for when the index reported by angular doesnt match
function getIndex(arr, key, value) {
    for (i = 0; i < arr.length; i += 1) {
        if (arr[i][key] === value) {
            delete window.arr;
            return i;
        }
    }
}

function fnSortArr(arrItems, strProp) { return arrItems.sort(function(a,b){return a[strProp]-b[strProp]}); }
function fnRSortArr(arrItems, strProp) { return arrItems.sort(function(a,b){return b[strProp]-a[strProp]}); }

var app = angular.module('SuddenFeedbackApp', [
    'mgcrea.ngStrap',
    'ngSanitize',
    'ngResource',
    'ngTagsInput',
    'ngAnimate',
    'nvd3'
]);

//api page / reroute for saving and loading non-streaming data
app.factory('FUIAPI', function($resource) {
    return $resource('/fuiapi', '', {
        'post': { method: 'POST' },
        'put': { method: 'PUT' },
        'delete': { method: 'DELETE' }
    });
});

app.controller('FUI', function($scope, $modal, FUIAPI) {

    $scope.play = true;

    $scope.widths = [
        {k: 'skinny', v: 1},
        {k: '1/6 width', v: 2},
        {k: '1/4 width', v: 3},
        {k: '1/3 width', v: 4},
        {k: '5/12 width', v: 5},
        {k: '1/2 width', v: 6},
        {k: '7/12 width', v:7},
        {k: '2/3 width', v: 8},
        {k: '3/4 width', v: 9},
        {k: '5/6 width', v: 10},
        {k: '11/12 width', v: 11},
        {k: 'full width', v: 12}
    ];

    $scope.heights = [
        {k: '1/8 height', v: '12.5'},
        {k: '1/4 height', v: '25'},
        {k: '1/2 height', v: '50'},
        {k: '3/4 height', v: '75'},
        {k: 'full height', v: '100'}
    ];

    $scope.sorts = [
        {k: 'priority', v: 'priority'},
        {k: 'age', v: 'id'},
        {k: 'username', v: 'user.screen_name'}
    ];

    $scope.limits = [
        {v: 25},
        {v: 50},
        {v: 100},
        {v: 250},
        {v: 500},
        {v: 1000},
        {v: 10000}
    ];

    $scope.wordFns = [
        {v: 'Find'},
        {v: 'Filter'},
        {v: 'Track'}
    ];

    $scope.shows = [
        {v: 'ColumnTitle'},
        {v: 'Notes'},
        {v: 'TermSet'},
        {v: 'AnalysisScore'},
        {v: 'Orphans'},
        {v: 'Slides'}
    ];

    //@Todo - these should load from the DB
    $scope.analysis = [
        {v: 'Sentiment'},
        {v: 'Simiarity'},
        {v: 'IntellectualDepth'},
        {v: 'Vulgarity'}
    ];

    $scope.colSorts = [
        {k: 'Analysis', v: 'score'},
        {k: 'Priority', v: 'priority'},
        {k: 'ID', v: 'id'},
        {k: 'Rotate', v: 'rotate'},
        {k: 'Static', v: 'currentOrder'}
    ];

    $scope.templates = [
        {k: 'Runoff, 3+terms, 1 column each', v: 'runoff'},
        {k: 'VS, 2 columns, 1 slideshow', v: 'VS'},
        {k: 'Inspect, 1 term, several perspectives', v: 'inspect'},
        {k: 'Custom', v: 'Custom'}
    ];

    $scope.comps = [
        {v: 'Items'},
        {v: 'Stats'},
        {v: 'Link'},
        {v: 'Tag'},
        {v: 'User'},
        {v: 'Mention'},
        {v: 'Filter'},
        {v: 'Map'},
        {v: 'Montage'},
        {v: 'Charts'},
        {v: 'WordCloud'}
    ];

    $scope.titles = [
        {v: 'none'},
        {v: 'user'}
    ];

    //create the master object
    //manage individual items from the websocket
    $scope.addItem = function(objItem){

        //console.log(objItem.column);

        //get the column
        var idxColumn = getIndex($scope.report.columns, 'id', objItem.column);
        var propArray;

        try {
            propArray = $scope.report.columns[idxColumn].items;
        } catch(e) {
            return;
        }

        //decide which collection/component within a column to work on
        if (objItem.typ !== 'item'){
            if($scope.report.columns[idxColumn].components.length > 0){
                _.forEach($scope.report.columns[idxColumn].components, function(objComp, i) {
                    if (objComp.typ === 'Stats'
                        || objComp.typ === objItem.typ
                    ) {
                        propArray = $scope.report.columns[idxColumn].components[i].items;
                    }
                });
            }else{return;} //dont put stats in main items
        }
        var intLength = 0;
        if(propArray){intLength = propArray.length;}

        var arrDelete = [];

        //||||  COLUMN+ARRAY LOOP  ||||\\
        //this is a one time loop through a collection when touched, do everything possible in the 1 loop.
        if (!objItem.priority) {
            objItem.priority = 1;
        }

        var torfRT = false; //set default priority, much of the system requires priority for realtime sorting

        _.forEach(propArray, function(objI,k) {

            //status decay, connected to border colors
            if (objI.status > 0) {
                objI.status -= 1;
            } else if (objI.status < 0) {
                objI.status += 1;
            } else {
                objI.status = 0;
            }

            if (torfRT === false && objI.text === objItem.text) {

                //cumulative priority
                if (objItem.priority < 2
                    || objItem.priority <= objI.priority
                ) {
                    objI.priority += 1;
                }
                else { //replacing priority
                    objI.priority = objItem.priority;
                }

                // it exists and has decayed to 0 already, so it's an update
                if (objI.status === 0) {
                    objI.status = 10;
                }

                torfRT = true;
            }

            //limit reached, start trimming
            if (intLength > $scope.report.columns[idxColumn].limit
                && objI.position > $scope.report.columns[idxColumn].limit
            ) {
                propArray.splice(k--, 1);
                intLength--;
            }
        });

        //column priority, report priority used for column %
        if (objItem.typ === 'item') {
            $scope.report.columns[idxColumn].priority += 1;
            $scope.report.priority += 1;
        }

        //get the analysis type, the col analysis SHOUL have a matching analysis property
        if (objItem.typ === 'item'
            && objItem.analysis
            && $scope.report.columns[idxColumn].analysis
        ) {
            var strAnalysis = $scope.report.columns[idxColumn].analysis.toLowerCase();
        }

        if(torfRT === false) {
            objItem.status= -5; //new item status count

            propArray.unshift(objItem);

            if (objItem.typ === 'item' && objItem.analysis && strAnalysis !== ''){
                $scope.report.columns[idxColumn].score += objItem.analysis[strAnalysis];
                $scope.addSlide(objItem);
            }
        } //add
        $scope.sortColumns();
    };

    $scope.nextColumn=function(){
        $scope.pause();
        $scope.report.colSort='currentOrder';
        _.forEach($scope.report.columns,function(objCol,k){
            if(objCol.currentOrder == $scope.report.columns.length-1){ $scope.report.columns[k].currentOrder=0;} //wrap 1st to the last, this is reverse ordered
            else{$scope.report.columns[k].currentOrder=$scope.report.columns[k].currentOrder+1;}
            //console.log(objCol.currentOrder);
        });
        $scope.report.columns=fnRSortArr($scope.report.columns,'currentOrder');
        //_.forEach($scope.report.columns,function(objCol,k){console.log(objCol.label+' : '+objCol.currentOrder)});;
    };

    $scope.sortColumns = function(){
        //Sort the columns (even if it's being done by angluar as well) to find the position add up the widths and figure out which ones are going to be off screen or set to 0 width
        $scope.report.columns=fnRSortArr($scope.report.columns,$scope.report.colSort);
    //if($scope.report.colSort=='currentOrder'){ _.forEach($scope.report.columns,function(objCol,k){console.log(objCol.label+' : '+objCol.currentOrder);}); }else{console.log($scope.report.colSort);}

        var intTotalColumnWidth=0;iCol=1;$scope.torfHiddenColumns=false; //add bootstrap column widths together
        _.forEach($scope.report.columns,function(objColumn,k){
            $scope.report.columns[k].currentOrder= $scope.report.columns.length-iCol; //reverses order by index
            if(intTotalColumnWidth+objColumn.width <= 12){ intTotalColumnWidth=intTotalColumnWidth+objColumn.width; $scope.report.columns[k].visible=true; }
            else{ $scope.report.columns[k].visible=false; $scope.torfHiddenColumns=true}
            iCol+=1;
        });
    }

    $scope.addSlide = function(objItem) {

        //find the slides column
        var idPresCol = getIndex($scope.report.columns, 'show', 'Slides');

        if (idPresCol) {
            //for some reason modifying the text for slide was causing it to mismatch and threw an ngrepeat error.
            //var arrBreakingCharacters = ['. ','? ','! ','; ',': ']; //add line breakes for slides
            //_.forEach(arrBreakingCharacters,function(strChar){ objItem.text = objItem.text.replace(strChar,strChar+"<br/>"); })
            $scope.report.columns[idPresCol].items[0] = objItem;
        }
    };

    //menu options, initial setup, either loaded from a previous setup, or defaults
    $scope.loadOptions = function() {
        FUIAPI.post({ a: 'init' },
            function(response) {
                //load any menu options and configs set in the DB that sit outside the report doc, system level
                $scope.report = response.report;

                if (!$scope.report.priority) {
                    $scope.report.priority = 0;

                    _.forEach($scope.report.columns, function(objC) {
                        $scope.report.priority += objC.priority;
                    });
                }

                $scope.layout(); //calculate the panel sizes based on column components

                $scope.session_uuid = response.session_uuid;

                // We have to wait for the session uuid to be set before starting the feed
                $scope.feed();
            }
        );
    };

    $scope.clear = function(){
        _.forEach($scope.report.columns, function(objCol, i) {
            $scope.report.columns[i].items = [];
            $scope.report.columns[i].priority = 1;

            if (objCol.components) {
                _.forEach(objCol.components, function(objComp, ii) {
                    $scope.report.columns[i].components[ii].items = [];
                });
            }
        });
    };

    $scope.listReports = function() {
        FUIAPI.post({ a: 'listReports' },
            function(response) {
                _.forEach(response.reportList,function(){

                });
                $scope.reportList = response.reportList;
            }
        );
    };

    $scope.loadReport = function(strReport, withData) {
        $scope.play = false;

        FUIAPI.post({ a: 'pauseStream' }, function() {
            FUIAPI.post({ a: 'loadReport', q: strReport },
                function(response) {
                    $scope.report = response;

                    FUIAPI.post({ a: 'playStream' }, function () {
                        $scope.play = true;
                    });
                }
            );
        });
    };

    $scope.delReport = function(strReport, withData) {
        FUIAPI.post({ a: 'delReport', q: strReport },
            function(response) {
                FUIAPI.post({ a: 'listReports' },
                    function(response) {
                        _.forEach(response.reportList,function(){

                        });
                        $scope.reportList = response.reportList;
                    }
                );
            }
        );
    };

    $scope.saveReport = function(withData) {
        $scope.pause();
        //the id will eventually be more complex than the name, for now this will do.
        if (!$scope.report._id || $scope.report._id !== $scope.report.name){$scope.report._id = $scope.report.name;}
        $scope.report.colCount = $scope.report.columns.length; //get the column count
        $scope.report.updated_at = (new Date).getTime();  //set the last update time
        if(!$scope.report.created_at){ $scope.report.created_at = (new Date).getTime(); }
        //save stats to history array and reset
        _.forEach($scope.report.columns,function(objCol,iCol){
            if(objCol.components){
                _.forEach(objCol.components,function(objCom,iCom){
                    _.forEach(objCom.items,function(objItem,iItem){
                        if(objItem.save===true){
                            if(objItem.history){ $scope.report.columns[iCol].components[iCom].items[iItem].history.push(objItem.priority); }
                            else{ $scope.report.columns[iCol].components[iCom].items[iItem].history=[objItem.priority]; } //1st item in history
                            objItem.history=$scope.report.columns[iCol].components[iCom].items[iItem].history;
                            //@TODO : If an optimization is needed, doing all stats in one loop would be moe efficient
                            $scope.report.columns[iCol].components[iCom].items[iItem].stats={min:0,max:0,avg:0,entries:0}
                            $scope.report.columns[iCol].components[iCom].items[iItem].stats.entries=objItem.history.length;
                            $scope.report.columns[iCol].components[iCom].items[iItem].stats.min=_.min(objItem.history);
                            $scope.report.columns[iCol].components[iCom].items[iItem].stats.max=_.max(objItem.history);
                            $scope.report.columns[iCol].components[iCom].items[iItem].stats.avg=_.max(objItem.history)/objItem.history.length;
                            $scope.report.columns[iCol].components[iCom].items[iItem].priority=0;
                        }
                    });
                });
            }
        });
        FUIAPI.post({ a: 'saveReport', q: $scope.report }, function(response) { $scope.pause(); } );
        //FUIAPI.put({a: 'saveReport', data_type: '', q: $scope.report},function(response){ });
    };

    $scope.addReport = function() {
        $scope.report = { _id: "blank", name: "blank" };
        $scope.report.terms = [{ name: "Template", fn: "Find", terms: [{ "text": "random" }] }];
        $scope.report.columns = [{
            "id" : 1,
            "label" : "New",
            "width" : 2,
            "priority" : 1,
            "sort" : "priority",
            "analysis" : "none",
            "show" : "ColumnTitle",
            "exclusive" : true,
            "source" : "twitter",
            "limit" : 100,
            "items" : [],
            "stats" : []
        }];
    };

    //manage already loaded item
    $scope.moveItem = function(objItem,newColumn) {};

    $scope.updateNote = function(t) {
        var intColumn = false;
        _.forEach($scope.report.columns, function(objCol) {
            if (objCol.show === 'Notes') {
                intColumn = objCol.id;
            }
        });

        if (intColumn) {
            var objItem = {
                column: intColumn,
                text: 'item note: ' + t.notes,
                priority: 1,
                typ: 'item'
            };

            $scope.addItem(objItem);
        }
    };

    $scope.delItem = function(idItem, idColumn) {
        var intColumn = false;
        intColumn = getIndex($scope.report.columns, 'id', idColumn);
        $scope.report.columns[intColumn].items.splice(getIndex($scope.report.columns[intColumn].items, 'id', idItem), 1);
    };

    //manage wordsets
    $scope.addSet = function() {

        //@Todo: replace System with Users name
        var newSet = { _id: "", user: "System", name: "New", terms: [] };

        $scope.report.terms.push(newSet);
        //FUIAPI.query({}, function(response) {});
    };

    // what the hell is a comp? ...comparison?
    $scope.addComp = function(idCol) {
        var intCol = getIndex($scope.report.columns, 'id', idCol);
        if(!$scope.report.columns[intCol].components){$scope.report.columns[intCol].components=[];}
        $scope.report.columns[intCol].components.push({ typ: 'Stats', height: '25' });
        $scope.layout(); //recalc heights
    };

    // what the hell is a comp? ...comparison?
    $scope.delComp = function(idCol, i) {
        var intCol = getIndex($scope.report.columns, 'id', idCol);
        $scope.report.columns[intCol].components.splice(i, 1);
    };

    // i assume this means a fucking column ??
    // LOL, I love constructive comments like this
    $scope.addCol = function() {
        var intColId=0
        if($scope.report.columns.length){intColId=$scope.report.columns.length;}
        $scope.report.columns.push({
             label: 'new'
            ,limit: 100
            ,sort: 'priority'
            ,width: 1
            ,show:true
            ,items: []
            ,stats: []
            ,priority: 1
            ,visible:true
            ,id: intColId
            ,currentOrder: intColId
        });
    };

    // i assume this means a fucking column ??
    $scope.delCol = function(idCol) {
        $scope.report.columns.splice(getIndex($scope.report.columns, 'id', idCol), 1);
    };

    // what exactly constitutes "layout" here?
    $scope.layout = function() {
        _.forEach($scope.report.columns, function(objCol, i) {
            var intItemContainerHeight = 100;

            if (objCol.components.length > 0) {
                _.forEach(objCol.components, function(objComp) {
                    intItemContainerHeight -= objComp.height;
                });
            }

            $scope.report.columns[i].itemsheight=intItemContainerHeight;
        });
    };

    // what the hell is a set?
    $scope.saveSet = function() {
        FUIAPI.post({ a: 'saveTerms', q: $scope.report.terms }, function(response) {
            console.log(response,'response');
        });
    };

    // what the hell is a set?
    $scope.loadSet = function() {
        FUIAPI.post({}, function(response){});
    };

    // what the hell is a set?
    $scope.delSet = function() {
        FUIAPI.post({}, function(response){});
    };

    // Pause the data feed
    $scope.pause = function() {
        if ($scope.play) {
            $scope.play = false;
            FUIAPI.post({ a: 'pauseStream' });
        } else {
            $scope.play = true;
            FUIAPI.post({ a: 'playStream' });
        }
    };

    // Stream the data feed, I think ??
    $scope.feed = function() {
        var socket = io.connect('http://localhost:3001/' + $scope.session_uuid); //connect to the websocket
        socket.on('newItems', function (arrItems) {
            if ($scope.play) {
                _.forEach(arrItems, function(objItem) { $scope.addItem(objItem); });
                $scope.$apply();
                arrItems = null;
            }
        });
    };

    // Let's get this party started
    $scope.init = function(){
        $scope.loadOptions();
    };

    //$scope.modalItem = function(objItem){ itemModal.show(); }

});

app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () { scope.$eval(attrs.ngEnter); });
                event.preventDefault();
            }
        });
    };
});
