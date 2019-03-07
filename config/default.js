module.exports = {
    "DB": {
        "Type":"postgres",
        "User":"",
        "Password":"",
        "Port":5432,
        "Host":"",
        "Database":""
    },
    "Host":
    {
        "domain": "127.0.0.1",
        "port": "8080",
        "version":"1.0.0.0",
        "hostpath":"./config",
        "logfilepath": ""
    },
    "Redis":
    {
        "mode":"sentinel",//instance, cluster, sentinel
        "ip": "45.55.142.207",
        "port": 6389,
        "user": "duo",
        "password": "DuoS123",
        "sentinels":{
            "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
            "port":16389,
            "name":"redis-cluster"
        }

    },
    "JobQueue":{
        "name":"1:103:cron:jobqueue"
    },
    "JobRemQueue":{
        "name":"1:103:cron:removequeue"
    },
    "Token": "",
    "WorkerID":"1:103:cronworker:1"






};
