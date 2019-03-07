
var httpReq = require('request');
var config= require('config');
var authToken= config.Token;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;

function CronCallbackHandler(callbackObj)
{
    try {
        console.log("Calling callback service : " + callbackObj.CallbackURL + " for cron pattern : " + callbackObj.pattern);
        var croneCallbacks =
            {
                url: callbackObj.CallbackURL,
                method: "POST",
                headers: {
                    'authorization': "bearer "+authToken,
                    'companyinfo': format("{0}:{1}", callbackObj.tenant, callbackObj.company),
                    'content-type': 'application/json'
                }};

        if(callbackObj.CallbackData)
        {
            croneCallbacks.body = result.CallbackData;
        }
        httpReq(croneCallbacks, function (error, response, data) {

            if(error)
            {
                var jsonString = messageFormatter.FormatMessage(error, "ERROR", false, undefined);
                logger.error('[DVP-ScheduledJobManager.CronCallbackHandler] -  Error ',jsonString);

            }
            else if (!error && response != undefined ) {

                var jsonString = messageFormatter.FormatMessage(undefined, "SUCCESS", false, response);
                logger.debug('[DVP-ScheduledJobManager.CronCallbackHandler] -  Success ',jsonString);


            }
            else
            {
                var jsonString = messageFormatter.FormatMessage(new Error("Error In Operation"), "ERROR", false, undefined);
                logger.error('[DVP-ScheduledJobManager.CronCallbackHandler] -  Error ',jsonString);
            }
        });
    }catch (e) {

        var jsonString = messageFormatter.FormatMessage(e, "ERROR", false, undefined);
        logger.error('[DVP-ScheduledJobManager.CronCallbackHandler] -  Error ',jsonString);
    }




};

module.exports.CronCallbackHandler = CronCallbackHandler;