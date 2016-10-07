'use strict';

const comise = require('comise');
const checkpoint = require('./helpers/checkpoint');
const toss = require('./helpers/toss');
const wait = require('./helpers/wait');
const Socket = require('./socket');

const DEFAULTS = require('./defaults.json').pool;

class Pool {

  //
  // Constructor
  //
  constructor (host, port, options) {
    checkpoint(_.isString(host), 'A host is required')
      .and(_.isString(port) || _.isNumber(port), 'A port is required');
    this.config = _.defaultsDeep(options || {}, DEFAULTS);
    this.host = host;
    this.port = port;
    this.sockets = {
      locked: {},
      free: {}
    };
  }

  //
  // Acquire
  //
  acquire (timeout, attempt) {
    return comise(function *() {
      for (let i = ACQUIRE_ATTEMPT-1; i >= 0; i--) {
        let socket = yield _acquireAttempt();
        if (socket) return socket;
        yield wait(ACQUIRE_TIMEOUT);
      }
      toss('Failed to acquire socket');
    });
  }

  //
  // Release
  //
  release (id) {
    let socket = this.sockets.locked[id];
    if (socket) {
      delete this.sockets.locked[id];
      this.sockets.free[id] = socket;
    }
  }

  //
  // Acquire Attempt
  //
  _acquireAttempt () {
    return comise(function *() {
      let freeIds = Object.keys(this.sockets.free);
      let lockedIds = Object.keys(this.sockets.locked);

      // Acquire a free socket
      if (freeIds.length) {
        let sockId = freeIds[0];
        let socket = this.sockets.free[sockId];
        delete this.sockets.free[sockId]
        socket.touch();
        this.sockets.locked[sockId] = socket;
        return socket;

      // Open a new socket
      } else if (lockedIds.length < this.config.max) {
        let socket = new Socket(this.host, this.port, { expire: this.config.socket_expire });
        socket.on('expire', () => {
          delete this.this.sockets.locked[socket.id];
          delete this.this.sockets.free[socket.id];
        });
        this.sockets.locked[socket.id] = socket;
        return socket;

      // Max sockets reached
      } else {
        return false;
      }
    });
  }
}
