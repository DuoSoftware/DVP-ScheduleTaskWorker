# FROM node:9.9.0
# ARG VERSION_TAG
# RUN git clone -b $VERSION_TAG https://github.com/DuoSoftware/DVP-ScheduleTaskWorker.git /usr/local/src/scheduletaskworker
# RUN cd /usr/local/src/scheduletaskworker;
# WORKDIR /usr/local/src/scheduletaskworker
# RUN npm install
# EXPOSE 8852
# CMD [ "node", "/usr/local/src/scheduletaskworker/app.js" ]

FROM node:10-alpine
WORKDIR /usr/local/src/scheduletaskworker
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8852
CMD [ "node", "app.js" ]
