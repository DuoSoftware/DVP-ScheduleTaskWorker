module.exports = {

    "Redis":
    {
        "mode": "instance",//instance, cluster, sentinel
        "ip": "138.197.90.92",
        "port": 6389,
        "user": "",
        "password": "",
        "db": 8,
        "sentinels": {
            "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
            "port": 16389,
            "name": "redis-cluster"
        }

    },
    "JobQueue": {
        "name": "cron_jobqueue"
    },
    "JobRemQueue": {
        "name": "cron_removequeue"
    },

    "WorkerID": "cronworker:1",
    "Services": {
        "accessToken": "",
        "ScheduleWorkerHost": "scheduleworker.app.veery.cloud",
        "ScheduleWorkerPort": "8080",
        "ScheduleWorkerVersion": "1.0.0.0",
        "dynamicPort": true
    }






};
