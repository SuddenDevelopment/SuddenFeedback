
function getIndex(arr,key,value){ for(i=0; i<arr.length;i++){ if(arr[i][key]==value){ delete window.arr; return i; } } } //shim function to get the index by a key/value for when the index reported by angular doesnt match

var app = angular.module('SuddenFeedbackApp', ['mgcrea.ngStrap','ngSanitize','ngResource','ngTagsInput']);
//api page / reoute for saving and loading non-streaming data
app.factory('FUIAPI', function($resource){ return $resource('/fuiapi', '',{
        'post':{method:'POST'}
    }) });

app.controller('FUI',function($scope,$modal,FUIAPI){
    $scope.widths=[{name:'skinny',width:1},{name:'1/6 width',width:2} ,{name:'1/4 width',width:3} ,{name:'1/3 width',width:4} ,{name:'5/12 width',width:5} ,{name:'1/2 width',width:6} ,{name:'7/12 width',width:7} ,{name:'2/3 width',width:8} ,{name:'3/4 width',width:9} ,{name:'5/6 width',width:10} ,{name:'11/12 width',width:11} ,{name:'full width',width:12} ];
    $scope.sorts=[{name:'priority',sort:'priority'},{name:'age',sort:'id'},{name:'username',sort:'user.screen_name'}];
    $scope.limits=[{limit:25},{limit:50},{limit:100},{limit:250},{limit:500},{limit:1000},{limit:10000}];
    $scope.lastText = '';
    //create the master object
    //manage individual items from the websocket
    $scope.addItem = function(objItem){ 
        //console.log(objItem.column);
        var idxColumn = getIndex($scope.report.columns,'id',objItem.column); //get the column
        var propArray='items'; if(objItem.typ!='Msg'){propArray='stats';} //decide which collection within a column to work on
        var intLength=$scope.report.columns[idxColumn][propArray].length;
        var arrDelete=[];
        //||||  COLUMN+ARRAY LOOP  ||||\\
        if(!objItem.priority){objItem.priority=1;} var torfRT=false; //set default priority, much of the system requires priority for realtime sorting
            for(i=0;i<intLength;i++){
                //this will be perfect as an optional way to keep a rolling relevent window
                //if($scope.report.columns[idxColumn][propArray][i].text!=objItem.text){ $scope.report.columns[idxColumn][propArray][i].priority--; } //decrease the priority on non matching items without a separate loop.
                if($scope.report.columns[idxColumn][propArray][i].status > 0){$scope.report.columns[idxColumn][propArray][i].status--;}else{$scope.report.columns[idxColumn][propArray][i].status=false;}   
                if($scope.report.columns[idxColumn][propArray][i].updated > 0){$scope.report.columns[idxColumn][propArray][i].updated--;}else{$scope.report.columns[idxColumn][propArray][i].updated=false;}          
                if(torfRT===false && $scope.report.columns[idxColumn][propArray][i].text==objItem.text){
                    if(objItem.priority < 2 || objItem.priority <= $scope.report.columns[idxColumn][propArray][i].priority){ $scope.report.columns[idxColumn][propArray][i].priority++; torfRT = true; } //cumulative priority
                    else{$scope.report.columns[idxColumn][propArray][i].priority = objItem.priority; torfRT = true;} //replacing priority
                    if($scope.report.columns[idxColumn][propArray][i].status==false){$scope.report.columns[idxColumn][propArray][i].updated=10;}
                }
                if(intLength>$scope.report.columns[idxColumn].limit && $scope.report.columns[idxColumn][propArray][i].position>$scope.report.columns[idxColumn].limit){ $scope.report.columns[idxColumn][propArray].splice(i--, 1); intLength--;} //limit reached, start trimming
            } //dedupe and set priority
            if(propArray=='items'){ $scope.report.columns[idxColumn].priority++;} //column priority
        if(torfRT === false){
            objItem.status=5;
            $scope.report.columns[idxColumn][propArray].unshift(objItem); 
        } //add
    }
    //menu options, initial setup, either loaded from a previous setup, or defaults
    $scope.loadOptions = function(){ FUIAPI.post({a:'init'},function(response){ 
        $scope.report=response; //load any menu options and configs set in the DB that sit outside the report doc, system level
        console.log(response); 
    }); }
    $scope.clear = function(){ for(var i=0;i<$scope.report.columns.length;i++){ $scope.report.columns[i].items=[]; $scope.report.columns[i].stats=[]; } }
    $scope.loadReport = function(objReport,withData){ FUIAPI.query({a:'loadReport'},function(response){  }); }
    $scope.saveReport = function(objReport,withData){ FUIAPI.post({a:'saveReport',q:$scope.report},function(response){ console.log(response,'response'); }); }
    //manage already loaded item
    $scope.moveItem = function(objItem,newColumn){}
    $scope.updateNote = function(t){ var objItem = {column:4,text:t.notes,priority:1,typ:'Msg'}; $scope.addItem(objItem);}
    $scope.delItem = function(idItem,idColumn){ $scope.report.columns[getIndex($scope.report.columns,'id',idColumn)].items.splice(getIndex($scope.report.columns.items,'id',idItem), 1);}
    //manage wordsets
    $scope.addSet = function(){ 
        var newSet = {_id:"",user:"System",name:"New",terms:[]}; //TODO: replace System with Users name
        $scope.report.terms.push(newSet);
        //FUIAPI.query({},function(response){  }); 
    }
    $scope.saveSet = function(){ FUIAPI.post({a:'saveTerms',q:$scope.report.terms},function(response){ console.log(response,'response'); }); }
    $scope.loadSet = function(){ FUIAPI.query({},function(response){  }); }
    $scope.delSet = function(){ FUIAPI.query({},function(response){  }); }
    //connect to the websocket
    $scope.feed = function(){
        var socket = io.connect('http://localhost:3001'); 
        socket.on('newItems', function (arrItems){ 
            angular.forEach(arrItems,function(objItem,k){ 
                $scope.addItem(objItem); 
            }); 
            $scope.$apply(); 
            arrItems=null; 
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
