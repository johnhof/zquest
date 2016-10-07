'use strict';

const cluster = require('cluster');
const ZMQ = require('zmq');
const zquest = require('../');

const WORK = 1000;
let doWork = (cb) => {
  setTimeout(cb, WORK)
}

let socket = ZMQ.socket('router');
socket.bindSync('tcp://127.0.0.1:5555');
console.log('Bound: tcp://127.0.0.1:5555');

socket.on('message', (msg) => {
  let message = zquest.parse(msg);
  doWork(() => {
    console.log('RECEIVED: ',process.pid, message);
    socket.send(JSON.stringify(message));
  });
});
