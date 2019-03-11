
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
var isValidPattern=false;


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



var onStartRecovery = function () {



    redisClient.llen(workerId,function (e,r) {


        redisClient.lrange(workerId,0,r,function (err,res) {
            CroneHandler.SearchCrashedJobData(res,function (err,data) {
                // console.log(err);
                if(data && data.Result)
                {
                    data.Result.forEach(function (item) {
                        item.callback={CallbackURL:item.CallbackURL,CallbackData:item.CallbackData,company:item.company,tenant:item.tenant,CronePattern:item.CronePattern};
                        jobCreater(item,false);
                    })

                }
            })

        });

    });
};

var recordCronWorkerId = function (workerId,cronId) {
    console.log("-------------------- Corn Id "+cronId+" Recording with Worker "+workerId+"----------------------------");
    redisClient.rpush(workerId,cronId.toString(),function (e,r) {
        console.log(e);
        console.log(r);
    });

}


var onNewJobRecieved = function()
{
    redisClient.blpop([jobQueue], 1,function (e,r) {

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

                jobCreater(varObj,true);

            }
            else
            {

                var jsonString = messageFormatter.FormatMessage(undefined, "SUCCESS", true, "No Job requests found ");
                logger.debug('[DVP-ScheduledJobManager.New Cron] -  Info ',jsonString);
            }
        }

        setTimeout(onNewJobRecieved, 500);


    });
}


var jobCreater = function(varObj,isRecordNeeded)
{

    console.log(JSON.stringify(varObj));

    if(varObj.checkDate)
    {
        varObj.CronePattern = new Date(varObj.CronePattern);
    }
    if(varObj.CronePattern  && varObj.UniqueId)
    {
        console.log("Job Creation of "+varObj.UniqueId);
        try {
            var job =new cronJob(varObj.CronePattern, function() {

                CroneHandler.CronCallbackHandler(this);

            }, null, false,varObj.Timezone,varObj.callback);

            var jobObj={id:varObj.UniqueId,job:job};

            Jobs.push(jobObj);
            job.start();
            var jsonString = messageFormatter.FormatMessage(undefined, "INFO", true, "New Cron job created and Started");
            logger.info('[DVP-ScheduledJobManager.Cron job creator] -  INFO ',jsonString);
            if(isRecordNeeded)
            {
                recordCronWorkerId(workerId,varObj.UniqueId);
            }
        }
        catch (e) {
            var jsonString = messageFormatter.FormatMessage(e, "ERROR", false, "New Cron job creation failed");
            logger.error('[DVP-ScheduledJobManager.Cron job creator] -  ERROR ',jsonString);
        }



    }
    else
    {
        var jsonString = messageFormatter.FormatMessage(new Error("Insufficient data for creating new job"), "ERROR", false, undefined);
        logger.error('[DVP-ScheduledJobManager.New Cron] -  Error ',jsonString);
    }
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
        redisClient.lrem(workerId,0,key);

    }
    else
    {
        var jsonString = messageFormatter.FormatMessage(undefined, "INFO", true, "JOB not found here");
        logger.info('[DVP-ScheduledJobManager.Remove Cron] -  JOB not found here ',jsonString);
    }



});



onStartRecovery();
//setInterval(onNewJobRecieved,5000);


onNewJobRecieved();




//recordCronWorkerId(workerId,"4444");