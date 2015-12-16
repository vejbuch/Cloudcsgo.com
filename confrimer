var SteamCommunity = require('steamcommunity');
var SteamTotp = require('steam-totp');
var code = SteamTotp.generateAuthCode('');
console.log(code);
var client = new SteamCommunity();
client.login({
    "accountName": "",
    "password": "",
    "twoFactorCode": code
}, function(err, sessionId, cookies, steamguard) {
var hash = require('crypto').createHash('sha1');
hash.update(Math.random().toString());
hash = hash.digest('hex');
device_id = 'android:' + hash;
console.log(device_id);
var SteamcommunityMobileConfirmations = require('steamcommunity-mobile-confirmations');
var steamcommunityMobileConfirmations = new SteamcommunityMobileConfirmations(
{
    steamid:         "",
    identity_secret: "",
    device_id:       device_id,
    webCookie:       cookies,
});

steamcommunityMobileConfirmations.FetchConfirmations((function (err, confirmations)
{
    if (err)
    {
        console.log(err);
        return;
    }
    console.log('steamcommunityMobileConfirmations.FetchConfirmations received ' + confirmations.length + ' confirmations');
    if ( ! confirmations.length)
    {
        return;
    }
    steamcommunityMobileConfirmations.AcceptConfirmation(confirmations[0], (function (err, result)
    {
        if (err)
        {
            console.log(err);
            return;
        }
        console.log('steamcommunityMobileConfirmations.AcceptConfirmation result: ' + result);
    }).bind(this));
}).bind(this));

})






