'use strict';

const ZMQ = require('zmq');

let socket = ZMQ.socket('rep');

socket.connect('tcp://127.0.0.1:5555');

socket.on('message', (data) => {
  console.log(data)
  socket.send('got it!');
});
