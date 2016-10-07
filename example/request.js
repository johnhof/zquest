'use strict';

let zquest = require('../index.js');

let request = {
  host: '127.0.0.1',
  port: 5555,
  data: `testing:${process.pid}:${new Date()}`
};

zquest(request)
  .then((res) => {
    console.log(`RETURNED: ${JSON.stringify(res.data)}`);
  })
  .catch((err) => {
    console.log(err.stack);
  });

console.log(`SENT: [${request.host}:${request.port}] :: ${request.data}`);
