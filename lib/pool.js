'use strict';

const comise = require('comise');
const checkpoint = require('./helpers/checkpoint');
const wait = require('./helpers/wait');

const ACQUIRE_TIMEOUT = 100; // 1/10 second
const ACQUIRE_ATTEMPT = 10; // 1 second of attempts

class Pool {
  constructor (host, port) {
    checkpoint(_.isString(host), 'A host is required')
      .and(_.isString(port) || _.isNumber(port), 'A port is required');
    this.host = host;
    this.port = port;
    this.sockets = {
      locked: [],
      free: []
    };
  }

  acquire (timeout, attempt) {
    return comise(function *() {
      let attempt = () => {
        if (this.sockets.free.length) {

        }
      };

      for (let i = ACQUIRE_ATTEMPT; i < )
    });
  }

  release (id) {

  }
}
