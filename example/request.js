'use strict';

let zquest = require('../index.js');

zquest({
  host: '127.0.0.1',
  port: 5555,
  data: 'testing:' + process.pid
}).then((data) => {
  console.log(data);
  console.log('done');
}).catch((err) => {
  console.log(err.stack);
  console.log('err');
});
