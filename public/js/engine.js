
function getIndex(arr,key,value){ for(i=0; i<arr.length;i++){ if(arr[i][key]==value){ delete window.arr; return i; } } } //shim function to get the index by a key/value for when the index reported by angular doesnt match
function fnSortArr(arrItems,strProp){ return _.sortBy(arrItems, function (obj) { return obj[strProp]; }); }

var app = angular.module('SuddenFeedbackApp', ['mgcrea.ngStrap','ngSanitize','ngResource','ngTagsInput','once']);
//api page / reoute for saving and loading non-streaming data
app.factory('FUIAPI', function($resource){ return $resource('/fuiapi', '',{ 'post':{method:'POST'} }) });

app.controller('FUI',function($scope,$modal,FUIAPI){
    $scope.play=true;
    $scope.widths=[{k:'skinny',v:1},{k:'1/6 width',v:2} ,{k:'1/4 width',v:3} ,{k:'1/3 width',v:4} ,{k:'5/12 width',v:5} ,{k:'1/2 width',v:6} ,{k:'7/12 width',v:7} ,{k:'2/3 width',v:8} ,{k:'3/4 width',v:9} ,{k:'5/6 width',v:10} ,{k:'11/12 width',v:11} ,{k:'full width',v:12} ];
    $scope.heights=[{k:'1/8 height',v:'12.5'},{k:'1/4 height',v:'25'},{k:'1/2 height',v:'50'},{k:'3/4 height',v:'75'},{k:'full height',v:'100'}];
    $scope.sorts=[{k:'priority',v:'priority'},{k:'age',v:'id'},{k:'username',v:'user.screen_name'}];
    $scope.limits=[{v:25},{v:50},{v:100},{v:250},{v:500},{v:1000},{v:10000}];
    $scope.wordFns=[{v:'Find'},{v:'Filter'},{v:'Track'}];
    $scope.shows=[{v:'ColumnTitle'},{v:'Notes'},{v:'TermSet'},{v:'AnalysisScore'},{v:'Orphans'},{v:'Slides'}];
    $scope.analysis=[{v:'Sentiment'},{v:'Simiarity'},{v:'IntellectualDepth'},{v:'Vulgarity'}]; //these shoukld load from the DB
    $scope.colSorts=[{k:'Analysis',v:'score'},{k:'Priority',v:'priority'},{k:'ID',v:'id'}];
    $scope.templates=[{k:'Runoff, 3+terms, 1 column each',v:'runoff'},{k:'VS, 2 columns, 1 slideshow',v:'VS'},{k:'Inspect, 1 term, several perspectives',v:'inspect'},{k:'Custom',v:'Custom'}];
    $scope.comps=[{v:'Items'},{v:'Stats'},{v:'Map'},{v:'Montage'},{v:'Charts'},{v:'WordCloud'}];
    //create the master object
    //manage individual items from the websocket
    $scope.addItem = function(objItem){ 
        //console.log(objItem.analysis);
        var idxColumn = getIndex($scope.report.columns,'id',objItem.column); //get the column
        var propArray='items'; if(objItem.typ!='Msg'){propArray='stats';} //decide which collection within a column to work on
        var intLength=$scope.report.columns[idxColumn][propArray].length;
        var arrDelete=[];
        //||||  COLUMN+ARRAY LOOP  ||||\\
        //this is a one time loop through a collection when touched, do everything possible in the 1 loop.
        if(!objItem.priority){objItem.priority=1;} var torfRT=false; //set default priority, much of the system requires priority for realtime sorting
            _.forEach($scope.report.columns[idxColumn][propArray],function(objI){
                if(objI.status > 0){objI.status--;}else if(objI.status < 0){objI.status++;}else{objI.status=0;} //status decay, connected to border colors  
                if(torfRT===false && objI.text==objItem.text){
                    if(objItem.priority < 2 || objItem.priority <= objI.priority){ objI.priority++;} //cumulative priority
                    else{objI.priority = objItem.priority;} //replacing priority
                    if(objI.status===0){objI.status=10;} // it exists and has decayed to 0 already, so it's an update
                    torfRT = true; 
                }
                if(intLength>$scope.report.columns[idxColumn].limit && objI.position>$scope.report.columns[idxColumn].limit){ $scope.report.columns[idxColumn][propArray].splice(i--, 1); intLength--;} //limit reached, start trimming            
            });
            if(propArray=='items'){ $scope.report.columns[idxColumn].priority++; $scope.report.priority++; } //column priority, report priority used for column %
            if(propArray=='items' && objItem.analysis){var strAnalysis = $scope.report.columns[idxColumn].analysis.toLowerCase();}
        if(torfRT === false){
            objItem.status= -5; //new item status count
            $scope.report.columns[idxColumn][propArray].unshift(objItem); 
            if(propArray=='items' && objItem.analysis){ 
                $scope.report.columns[idxColumn].score += objItem.analysis[strAnalysis]; 
                $scope.addSlide(objItem);
            }
        } //add
    }

    $scope.addSlide = function(objItem){ 
        var idPresCol = getIndex($scope.report.columns,'show','Slides');
        if(idPresCol){ //todo: convert this to a loop over an array for tighter code
            objItem.text = objItem.text.replace('. ',".<br/>")
            objItem.text = objItem.text.replace('? ',"?<br/>")
            objItem.text = objItem.text.replace('! ',"?<br/>")
            objItem.text = objItem.text.replace('; ',"?<br/>")
            objItem.text = objItem.text.replace(': ',"?<br/>")
            $scope.report.columns[idPresCol].items[0]=objItem; 
        }
    }
    //menu options, initial setup, either loaded from a previous setup, or defaults
    $scope.loadOptions = function(){ FUIAPI.post({a:'init'},function(response){ 
            $scope.report=response; //load any menu options and configs set in the DB that sit outside the report doc, system level
            if(!$scope.report.priority){$scope.report.priority=0; _.forEach($scope.report.columns,function(objC){$scope.report.priority+=objC.priority;});}
            console.log(response); 
        }); 
    }
    $scope.clear = function(){ for(var i=0;i<$scope.report.columns.length;i++){ $scope.report.columns[i].items=[]; $scope.report.columns[i].stats=[]; $scope.report.columns[i].priority=1; } }
    $scope.listReports = function(objReport,withData){ FUIAPI.post({a:'listReports'},function(response){ $scope.reportList=response.reportList; console.log(response); }); }
    $scope.loadReport = function(strReport,withData){ FUIAPI.post({a:'loadReport',q:strReport},function(response){ $scope.report=response; console.log(response); }); }
    $scope.delReport = function(strReport,withData){ FUIAPI.post({a:'delReport',q:strReport},function(response){ if(response=='report deleted'){ $scope.reportList.splice(getIndex($scope.reportList,'_id',strReport),1); } }); }
    $scope.saveReport = function(withData){ 
        if(!$scope.report._id||$scope.report._id!=$scope.report.name){$scope.report._id=$scope.report.name;} //the id will eventually be more complex than the name, for now this will do.
        FUIAPI.post({a:'saveReport',q:$scope.report},function(response){ }); 
    }
    $scope.addReport = function(){ 
        $scope.report={_id:"blank",name:"blank"};
        $scope.report.terms=[{name:"Template",fn:"Find",terms:[{"text":"WTF"}]}];
        $scope.report.columns=[{ "id" : 1, "label" : "New", "width" : 2, "priority" : 1, "sort" : "priority", "analysis" : "none", "show" : "ColumnTitle", "exclusive" : true, "source" : "twitter", "limit" : 100, "items" : [ ], "stats" : [ ] }] }
    //manage already loaded item
    $scope.moveItem = function(objItem,newColumn){}
    $scope.updateNote = function(t){
        var intColumn = false;
        _.forEach($scope.report.columns,function(objCol){ if(objCol.show=='Notes'){ intColumn=objCol.id; } });
        if(intColumn){ var objItem = {column:intColumn,text:'item note: '+t.notes,priority:1,typ:'Msg'}; $scope.addItem(objItem); }
    }
    $scope.delItem = function(idItem,idColumn){ 
        var intColumn = false;
        intColumn = getIndex($scope.report.columns,'id',idColumn);
        $scope.report.columns[intColumn].items.splice(getIndex($scope.report.columns[intColumn].items,'id',idItem), 1);}
    //manage wordsets
    $scope.addSet = function(){ 
        var newSet = {_id:"",user:"System",name:"New",terms:[]}; //TODO: replace System with Users name
        $scope.report.terms.push(newSet);
        //FUIAPI.query({},function(response){  }); 
    }
    $scope.addComp = function(idCol){ var intCol = getIndex($scope.report.columns,'id',idCol); $scope.report.columns[intCol].components.push({type:'Stats',height:'25'}); }
    $scope.addCol = function(){ 
        $scope.report.columns.push({label:'new',limit:100,sort:'priority',width:1,items:[],stats:[],priority:1,id:Math.floor((Math.random()*100)+1)}); 
    }
    $scope.delCol = function(idCol){ $scope.report.columns.splice(getIndex($scope.report.columns,'id',idCol),1); }
    $scope.saveSet = function(){ FUIAPI.post({a:'saveTerms',q:$scope.report.terms},function(response){ console.log(response,'response'); }); }
    $scope.loadSet = function(){ FUIAPI.post({},function(response){  }); }
    $scope.delSet = function(){ FUIAPI.post({},function(response){  }); }
    //connect to the websocket
    $scope.pause = function(){ 
        if($scope.play){$scope.play=false; console.log('pause');}else{$scope.play=true;} console.log('play');};
    $scope.feed = function(){
        var socket = io.connect('http://localhost:3001'); 
        socket.on('newItems', function (arrItems){ 
            if($scope.play){
                _.forEach(arrItems,function(objItem){ $scope.addItem(objItem); }); 
                $scope.$apply(); 
                arrItems=null;
            }
        });
    }
    //start everything
    $scope.init = function(){ 
        $scope.loadOptions(); 
        $scope.feed();
    }
    //$scope.modalItem = function(objItem){ itemModal.show(); }
    
});

app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){ scope.$eval(attrs.ngEnter); });
                event.preventDefault();
            }
        });
    };
});
