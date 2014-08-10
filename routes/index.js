var arrTerms=["Department of Homeland Security","Federal Emergency Management Agency","Coast Guard","Customs and Border Protection","Border Patrol","Secret Service","National Operations Center","Homeland Defense","Immigration Customs Enforcement","Agent","Task Force","Central Intelligence Agency","CIA","Fusion Center","Drug Enforcement Agency","DEA","Secure Border Initiative","Federal Bureau of Investigation","FBI","Alcohol Tobacco and Firearms","ATF","U.S. Citizenship and Immigration Services","Federal Air Marshal Service","Transportation Security Administration","TSA","Air Marshal","Federal Aviation Administration","FAA","National Guard","Red Cross","United Nations","Assassination","Attack","Domestic security","Drill","Exercise","Cops","Law enforcement","Authorities","Disaster assistance","Disaster management","DNDO (Domestic Nuclear Detection Office","National preparedness","Mitigation","Prevention","Response","Recovery","Dirty bomb","Domestic nuclear detection","Emergency management","Emergency response","First responder","Homeland security","Maritime domain awareness","MDA","National preparedness initiative","Militia Shooting","Shots fired","Evacuation","Deaths","Hostage","Explosion","explosive","Police","Disaster medical assistance team ","DMAT","Organized crime","Gangs","National security","State of emergency","Security","Breach","Threat","Standoff","SWAT","Screening","Lockdown","Bomb squad ","bomb threat","Crash","Looting","Riot","Emergency","Landing","Pipe bomb","Incident","Facility","Hazmat","Nuclear","Chemical spill","Suspicious package","suspicious device","Toxic","National laboratory","Nuclear facility","Nuclear threat","Cloud","Plume","Radiation","Radioactive","Leak","Biological infection","Chemical","Chemical burn","Biological","Epidemic","Hazardous","Hazardous material incident","Industrial spill","Infection","Powder","Gas","Spillover","Anthrax","Blister agent","Chemical agent","Exposure","Burn","Nerve agent","Ricin","Sarin","North Korea","Outbreak","Contamination","Exposure","Virus","Evacuation","Bacteria","Recall","Ebola","Food Poisoning","Foot and Mouth","H5N1","Avian","Flu","Salmonella","Small Pox","Plague","Human to human","Human to Animal","Influenza","Center for Disease Control","CDC","Drug Administration","FDA","Public Health","Toxic Agro","Terror Tuberculosis","Agriculture","Listeria","Symptoms","Mutation","Resistant","Antiviral","Wave","Pandemic","Infection","Water borne","air borne","Sick","Swine","Pork","Strain","Quarantine","H1N1","Vaccine","Tamiflu","Norvo Virus","Epidemic","World Health Organization","Viral Hemorrhagic Fever","E. Coli","Infrastructure security","Airport","CIKR","AMTRAK","Collapse","Computer infrastructure","Communications infrastructure","Telecommunications","Critical infrastructure","National infrastructure","Metro","WMATA","Airplane","Chemical fire","Subway","BART","MARTA","Port Authority","NBIC","Transportation security","Grid","Power","Smart","Body scanner","Electric","Failure or outage","Black out","Brown out","Port","Dock","Bridge","Cancelled","Delays","Service disruption","Power lines","Drug cartel","Violence","Gang","Drug","Narcotics","Cocaine","Marijuana","Heroin","Border","Mexico","Cartel","Southwest","Juarez","Sinaloa","Tijuana","Torreon","Yuma","Tucson","Decapitated","U.S. Consulate","Consular","El Paso","Fort Hancock","San Diego","Ciudad Juarez","Nogales","Sonora","Colombia","Mara salvatrucha","MS13 or MS-13","Drug war","Mexican army","Methamphetamine","Cartel de Golfo","Gulf Cartel","La Familia","Reynosa","Nuevo Leon","Narcos","Los Zetas","Shootout","Execution","Gunfight","Trafficking","Kidnap","Calderon","Reyosa","Bust","Tamaulipas","Meth Lab","Drug trade","Illegal immigrants","Smuggling","Matamoros","Michoacana","Guzman","Arellano-Felix","Beltran-Leyva","Barrio Azteca","Artistic Assassins","Mexicles","New Federation","Terrorism","Al Qaeda","Terror","Attack","Iraq","Afghanistan","Iran","Pakistan","Agro","Environmental terrorist","Eco terrorism","Conventional weapon","Target","Weapons grade","Dirty bomb","Enriched","Nuclear","Chemical weapon","Biological weapon","Ammonium nitrate","Improvised explosive device","IED","Abu Sayyaf","Hamas","FARC","IRA","ETA","Basque Separatists","Hezbollah","Tamil Tigers","PLF","PLO","Car bomb","Jihad","Taliban","Weapons cache","Suicide bomber","Suicide attack","Suspicious substance","AQAP","AQIM","TTP ","Yemen","Pirates","Extremism","Somalia","Nigeria","Radicals","Al-Shabaab","Home grown","Plot","Nationalist","Recruitment","Fundamentalism","Islamist","Emergency","Hurricane","Tornado","Twister","Tsunami","Earthquake","Tremor","Flood","Storm","Crest","Temblor","Extreme weather","Forest fire","Brush fire","Ice","Stranded/Stuck","Help","Hail","Wildfire","Tsunami Warning Center","Magnitude","Avalanche","Typhoon","Shelter-in-place","Disaster","Snow","Blizzard","Sleet","Mud slide or Mudslide","Erosion","Power outage","Brown out","Warning","Watch","Lightening","Aid","Relief","Closure","Interstate","Burst","Emergency Broadcast System","Cyber security","Botnet","DDOS","Denial of service","Malware","Virus","Trojan","Keylogger","Cyber Command","2600","Spammer","Phishing","Rootkit","Phreaking","Cain and abel","Brute forcing","Mysql injection","Cyber attack","Cyber terror","Hacker","China","Conficker","Worm","Scammers","Social media"];
function getIndex(arr,key,value){ for(i=0; i<arr.length;i++){ if(arr[i][key]==value){ delete arr; return i; } } } //shim function to get the index by a key/value for when the index reported by angular doesnt match

/*
 * GET home page.
 */
var _ = require('lodash');
var twitter = require('ntwitter');
var io = require('socket.io').listen(3001, {log: false});
var express = require('express');
var app = express();
app.use(express.cookieParser('this is just SALT in a wound'));
app.use(express.session({secret: "this is just SALT in a wound"}));
var sentiment = require('sentiment');
var torfSentiment = false;
var share = null;
var twit = null;
var uuid = require('node-uuid');

exports.setShare = function(obj) { share = obj; }

exports.index = function (req, res) {
    var arrItems=[];
    var fnSend = _.debounce(function(arrItems,io){
        if(arrItems.length > 0){
            io.sockets.emit('newItems', arrItems);
            return true;
        }
    },100,{'maxWait': 500});
    //console.log(req.session.term);
    // The first time a user visits we give them a unique ID to track them with
    if(!req.session.uuid) { req.session.uuid = uuid.v4(); }

    res.render('index', { title: 'SuddenFeedback' });
    
    var oauth = share.get('oauth', req.session.uuid);
    var twitData = share.get('twitData', req.session.uuid);

    if(oauth && !twitData && !twit){
        //console.log('no twitData, getting it',oauth);
        var twitter_credentials = share.get('twitter_credentials');
        var twit = new twitter({
            consumer_key: twitter_credentials.api_key,
            consumer_secret: twitter_credentials.api_secret,
            access_token_key: oauth.access_token,
            access_token_secret: oauth.access_token_secret
        });
        twit.verifyCredentials(function (err, data) {
            if(err){ console.log('getting twitData failed!',err); } 
            else{ twitData=data.id; share.set(twitData,'twitData', req.session.uuid); }
        });
    }
    var objReport = share.get('report');
    if(twit && objReport){
        //get the terms from the report used to track. Set in the report, will concat all terms that havf Fn==Find
        var terms2Track = [];
        //var userTerms = share.get('terms',req.session.uuid);
        
        //clean up the terms, the ttag module in the UI repaces spaces with -
        _.forEach(objReport.terms,function(objSet){
            if(objSet.fn=='Find'){ _.forEach(objSet.terms,function(objTerm){ terms2Track.push(objTerm.text.replace('-',' ')); }); }
        });
        
        //determine if sentiment analysis is needed, probably will be an array of analysis to run instead f individual torfs
        _.forEach(objReport.columns,function(objCol){ if(!torfSentiment && objCol.analysis && objCol.analysis.toLowerCase().indexOf('sentiment')!= -1){ torfSentiment=true; }});

        // console.log(terms2Track);
        twit.stream('statuses/filter', {track: terms2Track}, function (stream) {
            stream.on('error', function(error, code) { console.log("Stream error: " + error + ": " + code); });
            stream.on('data', function (objItem) {
                //console.log('stream on data',objItem);
                var torfSend = true;
                var filtered = false;
                //console.log(req.session.report);
                if(objReport && torfSend===true){
                    objItem.priority= 1;
                    if(objItem.retweeted_status !== undefined){if(objItem.retweeted_status.retweet_count > 0){ 
                        objItem.priority += objItem.retweeted_status.retweet_count;
                        objItem.entities=objItem.retweeted_status.entities;
                        objItem.retweeted_status = null; //kep the browser from needing to store all this
                    }}
                 //_________________________________________\\
                //----====|| NORMALIZE THE MESSAGE ||====----\\
                    objItem.typ='Msg';
                    objItem.text=fnCleanText(objItem.text,{});
                    objItem.created_at=(new Date).getTime();
                    //var objLatest = objItem; objLatest.column=4;arrItems.push(objLatest);//add latest
                    //objItem.column=4; arrItems.push(objItem);
                 //END NORMALIZING\\
                //#################\\
                 //_________________________________________\\
                //----====|| ADD ANALYSIS TO MESSAGE ||====----\\
                    objItem.analysis={};
                    if(torfSentiment){objItem.analysis.sentiment=sentiment(objItem.text).score;}
                 //END ANALYSIS\\
                //##############\\
                 //_____________________________________\\
                //----====|| SORT INTO COLUMNS ||====----\\
                    //loop through the root level term groups used
                    //console.log(req.session.report.terms);

                    //Global Filter
                    _.forEach(objReport.terms,function(objSet){ if(filtered==false && objSet.fn=='Filter'){ 
                        var strMatch= fnFirstTerm(objSet.terms,objItem.text);
                        if(strMatch){ filtered = true; objItem.analysis.filtered=strMatch; };
                     } });

                    //loop through the column level term groups used

                    //go through columns in order, col order matters for sorting, some items will pass through and add to multiple aolumns, default is to stop when a col is found
                    var intColIndex = false;
                    for(i=0;i<objReport.columns.length;i++){
                        if(objReport.columns[i].show.toLowerCase()=='notes' && objItem.analysis.filtered){ arrItems.push({column:objReport.columns[i].id,typ:'Msg',text:'filtered: '+objItem.analysis.filtered }); }
                        else if(objReport.columns[i].analysis=='sentiment=positive' && !objItem.analysis.filtered && objItem.analysis.sentiment > 0){ objItem.column=objReport.columns[i].id; }
                        else if(objReport.columns[i].analysis=='sentiment=negative' && !objItem.analysis.filtered && objItem.analysis.sentiment < 0){ objItem.column=objReport.columns[i].id; }
                        else if(objReport.columns[i].analysis=='sentiment=neutral' && !objItem.analysis.filtered && objItem.analysis.sentiment == 0){ objItem.column=objReport.columns[i].id; }
                        else if(objReport.columns[i].show=='ColumnTitle'){ 
                            var strNeedle = objReport.columns[i].label.toLowerCase();
                            if(objItem.text.toLowerCase().indexOf(strNeedle)!= -1){objItem.column=objReport.columns[i].id;}
                            else if(_.find(objReport.columns[i].hashtags,{ 'text':strNeedle })){ objItem.column=objReport.columns[i].id; }
                            else if(_.find(objReport.columns[i].user_mentions,{ 'screen_name':strNeedle })){ objItem.column=objReport.columns[i].id; }
                        }
                        if(objItem.column && objItem.analysis.filtered){ arrItems.push({column:objItem.column,typ:'Tag',text:'filtered: '+objItem.analysis.filtered }); } //add a per colum tag for filtered items
                        if(objItem.column){ intColIndex=i;}

                    }
                 //END COLUMN SORTING\\
                //####################\\
                //__________________________________\\
                //----====|| STORE LOCALLY ||====----\\
                    var torfRT = false;
                    if(objItem.column){
                        _.forEach(objReport.columns[intColIndex]['items'],function(objI){ 
                            if(objI.text==objItem.text){
                                if(objItem.priority < 2 || objItem.priority <= objI.priority){ objI.priority++;} //cumulative priority
                                else{objI.priority = objItem.priority;} //replacing priority
                                torfRT = true;
                            }         
                        });
                        if(torfRT === false){ 
                            objReport.columns[intColIndex]['items'].unshift(objItem); //add
                            objReport.columns[intColIndex]['items'] = fnSortArr(objReport.columns[intColIndex]['items'],objReport.columns[intColIndex].sort); //sort the column
                            if(getIndex(objReport.columns[intColIndex]['items'],'id',objItem.id)>objReport.columns[intColIndex].limit){ torfSend=false; }//make sure it's high enough sort order to sed to browser
                        }
                    }else{
                        console.log('column: '+objItem.column+"\n"+objItem.text)+"\n \n"; //when this is triggered no column was assigned, if it happens too often something is wrong
                    }
                //END LOCAL STORAGE\\
                //##################\\

                    //SEND IT TO THE BrowSER WEBSOCKET
                    if(torfSend && objItem.column>0){
                        arrItems.push(objItem);
                        //add stats
                        arrItems.push({column:objItem.column,typ:'User',text:objItem.user.screen_name});
                        for(var i=0;i<objItem.entities.urls.length;i++){ arrItems.push({column:objItem.column,typ:'Link',text:objItem.entities.urls[i].expanded_url.toLowerCase() }); }
                        for(var i=0;i<objItem.entities.symbols.length;i++){ arrItems.push({column:objItem.column,typ:'Symbol',text:objItem.entities.symbols[i].text.toLowerCase() }); }
                        for(var i=0;i<objItem.entities.user_mentions.length;i++){ arrItems.push({column:objItem.column,typ:'Mention',text:objItem.entities.user_mentions[i].screen_name.toLowerCase() }); }
                        for(var i=0;i<objItem.entities.hashtags.length;i++){ arrItems.push({column:objItem.column,typ:'Tag',text:objItem.entities.hashtags[i].text.toLowerCase() }); }
                    }else{ }
                    var torfSent = fnSend(arrItems,io);
                    if(torfSent){ arrItems=[]; }
                    //if(arrItems.length > 0){io.sockets.emit('newItems', arrItems);}
                }
            });
        }); //end stream
    }
}

var fnSortArr = function(arrItems,strProp){ return _.sortBy(arrItems, function (obj) { return obj[strProp]; }); }

/* TO BE PULLED INTO OTHER FILES / MODULES  */
var fnAllTerms = function(arrNeedles,strHaystack){
    arrMatches = [];
    for(var y=0;y<arrNeedles.length;y++){ 
        if(arrNeedles[y].hasOwnProperty('text')){strNeedle=arrNeedles[y].text.toLowerCase();}else{strNeedle=arrNeedles[y].toLowerCase();}
        if(strHaystack.toLowerCase().indexOf(strNeedle)!= -1){ arrMatches.push(strNeedle); } 
    }
    return arrMatches;
}

var fnFirstTerm = function(arrNeedles,strHaystack){
    //console.log(arrNeedles);
    //find the first term that matches and return it, return false if none found.
    var strMatch=false;
    for(var y=0;y<arrNeedles.length;y++){ 
        //console.log(arrNeedles[y]);
        if(arrNeedles[y].hasOwnProperty('text')){strNeedle=arrNeedles[y].text.toLowerCase();}else{strNeedle=arrNeedles[y].toLowerCase();}
        if(strMatch===false && strHaystack.toLowerCase().indexOf(strNeedle)!= -1){ strMatch = strNeedle; } 
    }
    return strMatch;
};

var fnCleanText = function(strSubject,objOptions){
    //REMOVE THE 1ST RT
    if(strSubject.substr(0,2) == 'RT'){ strSubject = strSubject.replace('RT ','');}
    //data.urls = data.text.match(/http[s]?:\S*/g); //should be in the entiites object already
    strSubject = strSubject.replace(/http[s]?:\S*/g,'');
    //REMOVE SOME NAMES
    strSubject = strSubject.replace(/@\S*\s/,'');
    return strSubject;
}
