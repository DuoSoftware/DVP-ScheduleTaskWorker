
var cronJob=require('cron').CronJob;
var parser = require('cron-parser');
var redis=require('ioredis');
var config=require('config');
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var CroneHandler=require('./CronHandler.js');
var workerId = config.WorkerID;

var jobQueue=config.JobQueue.name;
var remQueue=config.JobRemQueue.name;
var Jobs =[];


var redisip = config.Redis.ip;
var redisport = config.Redis.port;
var redispass = config.Redis.password;
var redismode = config.Redis.mode;
var redisdb = config.Redis.db;



var redisSetting =  {
    port:redisport,
    host:redisip,
    family: 4,
    password: redispass,
    db: redisdb,
    retryStrategy: function (times) {
        var delay = Math.min(times * 50, 2000);
        return delay;
    },
    reconnectOnError: function (err) {

        return true;
    }
};

if(redismode == 'sentinel'){

    if(config.Redis.sentinels && config.Redis.sentinels.hosts && config.Redis.sentinels.port && config.Redis.sentinels.name){
        var sentinelHosts = config.Redis.sentinels.hosts.split(',');
        if(Array.isArray(sentinelHosts) && sentinelHosts.length > 2){
            var sentinelConnections = [];

            sentinelHosts.forEach(function(item){

                sentinelConnections.push({host: item, port:config.Redis.sentinels.port})

            })

            redisSetting = {
                sentinels:sentinelConnections,
                name: config.Redis.sentinels.name,
                password: redispass,
                db: redisdb
            }

        }else{

            console.log("No enough sentinel servers found .........");
        }

    }
}

var redisClient = undefined;
var redisSubsClient = undefined;

if(redismode != "cluster") {
    redisClient = new redis(redisSetting);
    redisSubsClient = new redis(redisSetting);
}else{

    var redisHosts = redisip.split(",");
    if(Array.isArray(redisHosts)){


        redisSetting = [];
        redisHosts.forEach(function(item){
            redisSetting.push({
                host: item,
                port: redisport,
                family: 4,
                password: redispass,
                db: redisdb});
        });
        redisClient = new redis.Cluster([redisSetting]);
        redisSubsClient = new redis.Cluster([redisSetting]);

    }else{

        redisClient = new redis(redisSetting);
        redisSubsClient = new redis(redisSetting);
    }


}


redisClient.on("error", function (err) {
    console.log("Redis connection error  " + err);
});

redisClient.on("connect", function (err) {
    if(err)
    {
        console.log("Redis connection error",err);
    }
    else
    {
        console.log("Redis connected");
    }

});

redisSubsClient.on("error", function (err) {
    console.log("Redis Subs connection error  " + err);
});

redisSubsClient.on("connect", function (err) {
    if(err)
    {
        console.log("Redis Subs connection error",err);
    }
    else
    {
        console.log("Redis Subs connected");
    }

});

var recordCronWorkerId = function (workerId,cronId) {
    console.log("-------------------- Corn Id "+cronId+" Recording with Worker "+workerId+"----------------------------");
    redisClient.lpush(workerId,cronId.toString());

}


var onNewJobRecieved = function()
{
    redisClient.blpop(jobQueue,"list2 ","0",function (e,r) {

        if(e)
        {
            var jsonString = messageFormatter.FormatMessage(e, "ERROR", false, undefined);
            logger.error('[DVP-ScheduledJobManager.New Cron] -  Error ',jsonString);
        }
        else
        {
            if(r && r.length==2)
            {
                var varObj = JSON.parse(r[1]);

                if(varObj.pattern && varObj.timezone && varObj.reqId)
                {

                    var job=new cronJob(varObj.pattern, function() {

                        CroneHandler.CronCallbackHandler(this);

                    }, function () {

                    }, true,varObj.timezone,varObj.callback);

                    var jobObj={id:varObj.reqId,job:job};

                    Jobs.push(jobObj);
                    job.start();
                    recordCronWorkerId(workerId,varObj.reqId);

                    /*console.log("-------------------- Corn Id Recording with Worker ----------------------------");
                    redisClient.lpush(workerId,varObj.reqId);*/
                }
                else
                {
                    var jsonString = messageFormatter.FormatMessage(new Error("Insufficient data for creating new job"), "ERROR", false, undefined);
                    logger.error('[DVP-ScheduledJobManager.New Cron] -  Error ',jsonString);
                }

            }
            else
            {

                var jsonString = messageFormatter.FormatMessage(undefined, "SUCCESS", true, "No Job requests found ");
                logger.debug('[DVP-ScheduledJobManager.New Cron] -  Info ',jsonString);
            }
        }


    });
}

redisSubsClient.subscribe('1:103:cron:removequeue', function (err, count) {

});

redisSubsClient.on('message',function (channel,key) {
    var jsonString = messageFormatter.FormatMessage(undefined, "INFO", true, "Jobs removing");
    logger.info('[DVP-ScheduledJobManager.Remove Cron] -  INFO ',jsonString);
    var job= Jobs.filter(function (item) {
        return item.id==key;
    })

    if(Array.isArray(job)&& job[0] && job[0].job)
    {
        var jsonString = messageFormatter.FormatMessage(undefined, "INFO", true, "Jobs removing");
        logger.info('[DVP-ScheduledJobManager.Remove Cron] -  JOB found here ',jsonString);
        job[0].job.stop();
        Jobs = Jobs.filter(function (item) {
            return item.id!=key;
        })


    }
    else
    {
        var jsonString = messageFormatter.FormatMessage(undefined, "INFO", true, "Jobs removing");
        logger.error('[DVP-ScheduledJobManager.Remove Cron] -  JOB not found here ',jsonString);
    }

    redisClient.lrem(workerId,0,key);

});




 setInterval(onNewJobRecieved,5000);




//recordCronWorkerId(workerId,"4444");