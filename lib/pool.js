'use strict';

const comise = require('comise');
const _ = require('lodash');
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

    // Open and register min sockets
    for (let i = this.config.min-1; i >= 0; i--) {
      let socket = this._newSocket();
      if (socket) this.sockets.free[socket.id] = socket;
    }
  }

  //
  // Acquire
  //
  acquire () {
    let self = this;
    return comise(function *() {
      for (let i = self.config.acquire_attempts-1; i >= 0; i--) {
        let socket = self._acquireAttempt();
        if (socket) return socket;
        yield wait(self.config.acquire_retry);
      }
      toss('Failed to acquire socket');
    });
  }

  //
  // Release
  //
  release (id) {
    id = _.isString(id) ? id : id.id;
    let socket = this.sockets.locked[id];
    if (socket) {
      delete this.sockets.locked[id];
      this.sockets.free[id] = socket;
    }
  }

  //
  // Close
  //
  close () {
    let freeIds = Object.keys(this.sockets.free);
    for (let i = freeIds.length-1; i >= 0; i--) {
      let id = freeIds[i];
      this.sockets.free[id].close();
      delete this.sockets.free[id];
    }
    let lockedIds = Object.keys(this.sockets.locked);
    for (let i = lockedIds.length-1; i >= 0; i--) {
      let id = lockedIds[i];
      this.sockets.locked[id].close();
      delete this.sockets.locked[id];
    }
  }

  //
  // Acquire Attempt
  //
  _acquireAttempt () {
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
      let socket = this._newSocket()
      if (socket) this.sockets.locked[socket.id] = socket;
      return socket;

    // Max sockets reached
    } else {
      return false;
    }
  }

  _newSocket () {
    let socket = new Socket(`tcp://${this.host}:${this.port}`, { expire: this.config.socket_expire });
    // Set socket to self manage
    socket.on('expire', () => {
      delete this.sockets.locked[socket.id];
      delete this.sockets.free[socket.id];

      // make sure min sockets are alive
      let freeIds = Object.keys(this.sockets.free);
      let lockedIds = Object.keys(this.sockets.locked);
      if ((freeIds.length + lockedIds.length) < this.config.min) {
        let socket = this._newSocket();
        this.sockets.free[socket.id] = socket;
      }
    });
    return socket;
  }
}

module.exports = Pool;
