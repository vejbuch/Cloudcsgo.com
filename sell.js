var admin = '';
var SteamTotp = require('steam-totp');
var code = SteamTotp.generateAuthCode('');
console.log(code);

var logOnOptions = {
	accountName: '',
	password: '',
  twoFactorCode: code
};
var GameTime = 120;


////

var authCode = ''; 

var globalSessionID;
if (require('fs').existsSync('sentry_'+logOnOptions['accountName']+'.hash')) {
	logOnOptions['shaSentryfile'] = require('fs').readFileSync('sentry_'+logOnOptions['accountName']+'.hash');
} else if(require('fs').existsSync('ssfn_'+logOnOptions['accountName'])) {
	var sha = require('crypto').createHash('sha1');
	sha.update(require('fs').readFileSync('ssfn_'+logOnOptions['accountName']));
	var sentry = new Buffer(sha.digest(), 'binary');
	logOnOptions['shaSentryfile'] = sentry;
	require('fs').writeFileSync('sentry_'+logOnOptions['accountName']+'.hash', sentry);
	console.log('Converting ssfn to sentry file!');
	console.log('Now you can remove ssfn_'+logOnOptions['accountName']);
} else if (authCode != '') {
	logOnOptions['authCode'] = authCode;
}

var sitename;

sitename = "cloudcsgo.com";
var Steam = require('steam');
var SteamTradeOffers = require('steam-tradeoffers');
var getSteamAPIKey = require('steam-web-api-key');
var mysql      = require('mysql');
var request = require("request");

var APIKey = "";

var mysqlInfo;
mysqlInfo = {
  host     : '',
  user     : '',
  password : '',
  database : '',
  charset  : 'utf8_general_ci'
};

var mysqlConnection = mysql.createConnection(mysqlInfo);

var steam = new Steam.SteamClient();
var offers = new SteamTradeOffers();



var recheck = true;
var code = SteamTotp.generateAuthCode('');
steam.logOn(logOnOptions);

steam.on('debug', function(text){
	console.log(text);
	require('fs').appendFile('debug.log', text+'\n');
});

function getUserName(steamid) {
	getUserInfo(steamid, function(error, data){
		if(error) throw error;
		var datadec = JSON.parse(JSON.stringify(data.response));
		return (datadec.players[0].personaname);
	});
}

function proceedWinners() {
	var url = 'http://'+sitename+'/getwinner34634fcsgo.php';
	request(url, function(error, response, body){});
}

function getUserInfo(steamids,callback) {
	var url = 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key='+APIKey+'&steamids='+ steamids + '&format=json';
	request({
		url: url,
		json: true
	}, function(error, response, body){
		if(!error && response.statusCode === 200){
			callback(null, body);
		} else if (error) {
			getUserInfo(steamids,callback);
		}
	});
}

function addslashes(str) {
    str=str.replace(/\\/g,'\\\\');
    str=str.replace(/\'/g,'\\\'');
    str=str.replace(/\"/g,'\\"');
    str=str.replace(/\0/g,'\\0');
	return str;
}

var locked=false,proceeded;
var itemscopy;
var detected=false;
var detected2=false;
var endtimer = -1;
function weblogon() {
steam.webLogOn(function(newCookie){
      getSteamAPIKey({
        sessionID: globalSessionID,
        webCookie: newCookie
      }, function(err, APIKey) {
        offers.setup({
          sessionID: globalSessionID,
          webCookie: newCookie,
          APIKey: APIKey
        }, function() {
        if (typeof callback == "function") {
callback();
}
        });
      });
    });
}

/*
function weblogon() {
	steam.webLogOn(function(newCookie) {
		offers.setup({
			sessionID: globalSessionID,
			webCookie: newCookie
		}, function(err) {
			if (err) {
			}
		});
	});	
}
*/
function sendoffers(){
	detected2 = false;
	offers.loadMyInventory({
		appId: 730,
		contextId: 2
	}, function(err, itemx) {
		if(err) {
			weblogon();
			setTimeout(sendoffers,2000);
			return;
		}
		if(detected2 == true) {
			return;
		}
		detected2 = true;
		itemscopy = itemx;
		detected = false;
		mysqlConnection.query('SELECT * FROM `queue` WHERE `status`=\'active\'', function(err, row, fields) {
			if(err) {
				return;
			}
			if(detected == true) {
				return;
			}
			detected = true;
			for(var i=0; i < row.length; i++) {
				var gameid = row[i].id;
				var sendItems = (row[i].items).split('/');
				var item=[],num=0;
				for (var x = 0; x < itemscopy.length; x++) {
					for(var j=0; j < sendItems.length; j++) {
						if (itemscopy[x].tradable && (itemscopy[x].market_name).indexOf(sendItems[j]) == 0) {
							sendItems[j] = "hgjhgnhgjgnjghjjghjghjghjhgjghjghjghngnty";
							itemscopy[x].market_name = "fgdfgdfgdfgdfgfswfewefewrfewrewrewr";
							item[num] = {
								appid: 730,
								contextid: 2,
								amount: itemscopy[x].amount,
								assetid: itemscopy[x].id
							}
							num++;
						}
					}
				}
				if (num > 0) {
					var gamenum = row[i].id;
					offers.makeOffer ({
						partnerSteamId: row[i].userid,
						itemsFromMe: item,
						accessToken: row[i].token,
						itemsFromThem: [],
						message: 'Your winnings on the site '+sitename+' game #'+gamenum
					}, function(err, response){
						if (err) {
							console.log(err); return;
						}
            
						mysqlConnection.query('INSERT INTO `offers` (`gameid`,`stav`,`offerid`) VALUES (\''+gameid+'\',\'1\',\''+response.tradeofferid+'\')', function(err, row, fields) {});
            mysqlConnection.query('UPDATE `queue` SET `status`=\'sent '+response+'\' WHERE `id`=\''+gameid+'\'', function(err, row, fields) {});
						console.log('Trade offer for queue '+gamenum+' sent!');	
					});
				}
			}
		});
})}

function EndGame() {
	endtimer = -1;
	proceedWinners();
	setTimeout(sendoffers,1000);
}

steam.on('loggedOn', function(result) {
	console.log('Logged in!');
	steam.setPersonaState(Steam.EPersonaState.LookingToTrade);
	steam.addFriend(admin);
	steam.sendMessage(admin,"Я включился!");
});

steam.on('webSessionID', function(sessionID) {
	globalSessionID = sessionID;
	weblogon();
	setTimeout(function(){
		mysqlConnection.query('SELECT `value` FROM `info` WHERE `name`=\'current_game\'', function(err, rows, fields) {
			if(err) return;
			mysqlConnection.query('SELECT `starttime` FROM `games` WHERE `id`=\''+rows[0].value+'\'', function(errs, rowss, fieldss) {
				if(errs) return;
				var timeleft;
				if(rowss[0].starttime == 2147483647) timeleft = GameTime;
				else {
					var unixtime = Math.round(new Date().getTime()/1000.0);
					timeleft = rowss[0].starttime+GameTime-unixtime;
					if(timeleft < 0) timeleft = 0;
				}
				if(timeleft != GameTime) {
					setTimeout(EndGame,timeleft*1000);
					console.log('Restoring game on '+timeleft+'second');
				}
			});	
		});
	},1500);
});


function in_array(needle, haystack, strict) {
	var found = false, key, strict = !!strict;

	for (key in haystack) {
		if ((strict && haystack[key] === needle) || (!strict && haystack[key] == needle)) {
			found = true;
			break;
		}
	}

	return found;
}



function checkoffers(number) {
	if (number > 0) {
    console.log('>>>>>>> Prichazi offer na cloudcsgo.com <<<<<<<<<<<<');
    var casicek = Math.round(Date.now() / 1000);
    console.log(casicek);            
		offers.getOffers({
			get_received_offers: 1,
			active_only: 1,
			time_historical_cutoff: Math.round(Date.now() / 1000)
		}, function(error, body) {
			if(error) {
				checkoffers(10);
        console.log(error);		
				return;
			}
      console.log('>>>>>>> Prichazi offer na cloudcsgo.com <<<<<<<<<<<< KTERY POKRACUJE');
			if(body.response.trade_offers_received){
				body.response.trade_offers_received.forEach(function(offer) {
					if (offer.trade_offer_state == 2){
						if(offer.items_to_give) {
							offers.declineOffer({tradeOfferId: offer.tradeofferid});
							return;
						}		
						if(offer.items_to_receive == undefined) return;				
						mysqlConnection.query('SELECT `value` FROM `info` WHERE `name`=\'maxitems\'', function(err, row, fields) {
							if(offer.items_to_receive.length > row[0].value) {
								offers.declineOffer({tradeOfferId: offer.tradeofferid});
								offer.items_to_receive = [];
								mysqlConnection.query('INSERT INTO `messages` (`userid`,`msg`,`from`) VALUES (\''+offer.steamid_other+'\',\'toomuch\',\'System\')', function(err, row, fields) {});
								return;
							}
						});
						var delock = false;
						offers.loadPartnerInventory({partnerSteamId: offer.steamid_other, appId: 730, contextId: 2, tradeOfferId: offer.tradeofferid, language: "en"}, function(err, hitems) {
							if(err) {
								weblogon();
								recheck = true;
								return;
							}
							if(delock == true) return;
							delock = true;
							var items = offer.items_to_receive;
							var wgg=[],num=0;
							for (var i = 0; i < items.length; i++) {
								for(var j=0; j < hitems.length; j++) {
									if(items[i].assetid == hitems[j].id) {
										wgg[num] = hitems[j];
										num++;
										break;
									}
								}
							}
							var price=[];
							for(var i=0; i < num; i++) {
								if(wgg[i].appid != 730) {
									offers.declineOffer({tradeOfferId: offer.tradeofferid});
									mysqlConnection.query('INSERT INTO `messages` (`userid`,`msg`,`from`) VALUES (\''+offer.steamid_other+'\',\'onlycsgo\',\'System\')', function(err, row, fields) {});
									return;
								}
								if(wgg[i].market_name.indexOf("Souvenir") != -1) {
                  console.log('Chci suveniry :-) (Co když je to cobble <3)');
									//offers.declineOffer({tradeOfferId: offer.tradeofferid});
									//mysqlConnection.query('INSERT INTO `messages` (`userid`,`msg`,`from`) VALUES (\''+offer.steamid_other+'\',\'souvenir\',\'System\')', function(err, row, fields) {});
									//return;
								}
								var itemname = wgg[i].market_name;
								var url = 'http://'+sitename+'/cost.php?gg=1&item='+encodeURIComponent(itemname);
								(function(someshit) {
								request(url, function(error, response, body){
									if(!error && response.statusCode === 200){
										if(body == "notfound") { offers.declineOffer({tradeOfferId: offer.tradeofferid}); mysqlConnection.query('INSERT INTO `messages` (`userid`,`msg`,`from`) VALUES (\''+offer.steamid_other+'\',\'notavailable\',\'System\')', function(err, row, fields) {}); }
										else {
											wgg[someshit].cost = parseFloat(body);
										}
									} else offers.declineOffer({tradeOfferId: offer.tradeofferid});
								});})(i)
							}
							setTimeout(function() {
								var sum=0;
								for(var i=0; i < num; i++) {
									sum += wgg[i].cost;
								}
								mysqlConnection.query('SELECT `value` FROM `info` WHERE `name`=\'minbet\'', function(err, row, fields) {
									if(sum < row[0].value) { 
										num = 0;
										offers.declineOffer({tradeOfferId: offer.tradeofferid});
										mysqlConnection.query('INSERT INTO `messages` (`userid`,`msg`,`from`) VALUES (\''+offer.steamid_other+'\',\'toosmall!\',\'System\')', function(err, row, fields) {});
										return;
									}
								});
												getUserInfo(offer.steamid_other, function(error, data){
													if(error) throw error;
													var datadec = JSON.parse(JSON.stringify(data.response));
													var name = addslashes(datadec.players[0].personaname);
                          
                          console.log('Tradehold overeni - START');
                          var avatar = (datadec.players[0].avatarfull);
													if(num == 0) return;
      mysqlConnection.query('SELECT `tokeen` FROM `users` WHERE `steamid`=\''+offer.steamid_other+'\'', function(err, row, fields) {

          
          var url = row[0].tokeen;
          if (url == ''){
          offers.declineOffer({tradeOfferId: offer.tradeofferid});
          mysqlConnection.query('INSERT INTO `messages` (`userid`,`msg`,`from`) VALUES (\''+offer.steamid_other+'\',\'You have bad tradeURL!\',\'System - Bot\')', function(err, row, fields) {});
          return;
          }
          console.log('Uzivatel '+name+' má token '+url+' <><><><><><>');
          offers.getHoldDuration({partnerSteamId: offer.steamid_other, accessToken: url}, function(err, response)
                          {
                            if (err)
                          {
                            offers.declineOffer({tradeOfferId: offer.tradeofferid});
                            mysqlConnection.query('INSERT INTO `messages` (`userid`,`msg`,`from`) VALUES (\''+offer.steamid_other+'\',\'You have bad tradeURL or have tradehold!\',\'System - Bot\')', function(err, row, fields) {});
                            return;
                        }
                        console.log(response);
                        if(response.their !== 0){
                        offers.declineOffer({tradeOfferId: offer.tradeofferid});
                        mysqlConnection.query('INSERT INTO `messages` (`userid`,`msg`,`from`) VALUES (\''+offer.steamid_other+'\',\'You have bad tradeURL or have tradehold!\',\'System - Bot\')', function(err, row, fields) {});
                        console.log('NEEEEEEEEE - A1');
                        return;
                        }else{
                        
                        	offers.acceptOffer({tradeOfferId: offer.tradeofferid}, function(err, response) {
														if(err != null) return;
														mysqlConnection.query('SELECT `value` FROM `info` WHERE `name`=\'current_game\'', function(err, row, fields) {
															var current_game = (row[0].value);
															mysqlConnection.query('SELECT `cost`,`itemsnum` FROM `games` WHERE `id`=\''+current_game+'\'', function(err, row, fields) {
																var current_bank = parseFloat(row[0].cost);
																var itemsnum = row[0].itemsnum;
																if(itemsnum > 0) {
																	endtimer = setTimeout(EndGame,GameTime*1000);
																	mysqlConnection.query('UPDATE `games` SET `starttime`=UNIX_TIMESTAMP() WHERE `id` = \'' + current_game + '\' AND `starttime`= \'2147483647\'', function(err, row, fields) {});
																}
																for(var j=0; j < num; j++) {
																	mysqlConnection.query('INSERT INTO `game' + current_game + '` (`userid`,`username`,`item`,`color`,`value`,`avatar`,`image`,`from`,`to`) VALUES (\'' + offer.steamid_other + '\',\'' + name + '\',\'' + wgg[j].market_name + '\',\'' + wgg[j].name_color + '\',\'' + wgg[j].cost + '\',\'' + avatar + '\',\'' + wgg[j].icon_url + '\',\''+current_bank+'\'+\'0\',\''+current_bank+'\'+\''+wgg[j].cost+'\')', function(err, row, fields) {});
																	mysqlConnection.query('UPDATE `games` SET `itemsnum`=`itemsnum`+1, `cost`=`cost`+\''+wgg[j].cost+'\' WHERE `id` = \'' + current_game + '\'', function(err, row, fields) {});
																	current_bank = parseFloat(current_bank + wgg[j].cost);
																	itemsnum++;
																}
																if(itemsnum > 100) {
																	clearTimer(endtimer);
																	endtimer = -1;
																	EndGame();
																}
																console.log('Prijimam offer #'+offer.tradeofferid+' od '+name+' ('+offer.steamid_other+')');
															});
														});
													});
                        
                        }
		}); 
    });
												});
								},3000);
						});
					}
				});
			}
		});
	}
}

var pew;
steam.on('tradeOffers', checkoffers);
steam.on('tradeOffers', sendoffers);

steam.on('sentry', function(data) {
	require('fs').writeFileSync('sentry_'+logOnOptions['accountName']+'.hash', data);
});

setInterval(function () {
	mysqlConnection.query('SELECT 1');
}, 5000);
