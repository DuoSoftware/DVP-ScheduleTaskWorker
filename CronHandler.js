
var httpReq = require('request');
var config= require('config');
var authToken= config.Services.accessToken;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var format=require('stringformat');
var validator = require('validator');

var scheduleUrl;
if (config.Services && config.Services.ScheduleWorkerHost && config.Services.ScheduleWorkerPort&& config.Services.ScheduleWorkerVersion) {

    scheduleUrl = format("http://{0}/DVP/API/{1}/Crons/Recover", config.Services.ScheduleWorkerHost, config.Services.ScheduleWorkerVersion);
    if (validator.isIP(config.Services.ScheduleWorkerHost))
        scheduleUrl = format("http://{0}:{1}/DVP/API/{2}/Crons/Recover", config.Services.ScheduleWorkerHost, config.Services.ScheduleWorkerPort, config.Services.ScheduleWorkerVersion);
}

console.log(scheduleUrl);

//var scheduleUrl="http://"+config.Services.ScheduleWorkerHost+"/DVP/API/1.0.0.0/Crons/Recover";

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
            croneCallbacks.body = callbackObj.CallbackData;
        }
        httpReq(croneCallbacks, function (error, response, data) {

            if(error)
            {
                var jsonString = messageFormatter.FormatMessage(error, "ERROR", false, undefined);
                logger.error('[DVP-ScheduledJobManager.CronCallbackHandler] -  Error ',jsonString);

            }
            else if (!error && response != undefined ) {

                var jsonString = messageFormatter.FormatMessage(undefined, "SUCCESS", true, response);
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

function SearchCrashedJobData(ids,workerId,callback)
{
    try {

        var croneCallbacks =
            {
                url: scheduleUrl,
                method: "POST",
                headers: {
                    'authorization': "bearer "+authToken,
                    'companyinfo': format("{0}:{1}", 1, 103),
                    'content-type': 'application/json'
                }};

        if(ids)
        {
            croneCallbacks.body =JSON.stringify({
                "Ids":ids,
                "workerId":workerId
            }) ;
        }
        httpReq(croneCallbacks, function (error, response, data) {

            if(error)
            {
                var jsonString = messageFormatter.FormatMessage(error, "ERROR", false, undefined);
                logger.error('[DVP-ScheduledJobManager.CronCallbackHandler] -  Error ',jsonString);
                callback(error,undefined);

            }
            else if (!error && response != undefined ) {

                var jsonString = messageFormatter.FormatMessage(undefined, "SUCCESS", false, response);
                //logger.debug('[DVP-ScheduledJobManager.CronCallbackHandler] -  Success ',jsonString);
                callback(undefined,JSON.parse(response.body));

            }
            else
            {
                var jsonString = messageFormatter.FormatMessage(new Error("Error In Operation"), "ERROR", false, undefined);
                logger.error('[DVP-ScheduledJobManager.CronCallbackHandler] -  Error ',jsonString);
                callback(new Error("Error In Operation"),undefined);
            }
        });
    }catch (e) {

        var jsonString = messageFormatter.FormatMessage(e, "ERROR", false, undefined);
        logger.error('[DVP-ScheduledJobManager.CronCallbackHandler] -  Error ',jsonString);
        callback(e,undefined);
    }
}

module.exports.CronCallbackHandler = CronCallbackHandler;
module.exports.SearchCrashedJobData = SearchCrashedJobData;
