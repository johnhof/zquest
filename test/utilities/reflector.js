'use strict';

//
// Reflector is a ROUTER class to allow async processing of
// zmq messages. This is required to test concurrency in the client.
// A similar pattern (+DEALER) is the most realistic use of zquest
//
//

const ZMQ = require('zmq');
const _ = require('lodash');

const checkpoint = require('../../lib/helpers/checkpoint');

const WORK = 1000;

class Reflector {
  constructor(url, opts) {
    checkpoint(_.isString(url), 'url is required');
    opts = opts || {};
    this.debug = opts.debug || false;
    this.work = opts.work || WORK;

    this.router = ZMQ.socket('router');
    this.router.identity = 'incoming:' + process.pid;
    let self = this;
    this.router.on('message', function ()  {
      let data = self.parsePayload(arguments);
      if (self.debug) console.log('RECEIVED: ' + data.payload.parsed);
      self.router.send(data.array);
    });

    this.router.bindSync(url);
  }

  close() {
    this.router.close();
  }

  parsePayload (argus) {
    let args = Array.apply(null, argus);
    let last = args.length-1;
    return {
      original: argus,
      array: args,
      envelope: args.slice(0, last),
      payload: {
        raw: args[last],
        parsed: args[last].toString()
      }
    };
  }
}

module.exports = Reflector;
