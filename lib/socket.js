'use strict';

const ZMQ = require('zmq');
const _ = require('lodash');
const UUID = require('uuid');
const checkpoint = require('./helpers/checkpoint');
const wait = require('./helpers/wait');

const DEFAULTS = require('./defaults').pool;

class Socket {
  constructor (url, options) {
    options = options || {} ;
    checkpoint(_.isString(url), 'A url is required');
    let socket = ZMQ.socket('req');
    socket.connect(url);
    this.id = UUID.v4();
    this.url = url;
    this.socket = socket;
    this.timeout;
    this.expired = false;
    if (options.expire === false) {
      this.expire = false;
    }  else {
      this.expire = options.expire || DEFAULTS.socket_expire;
      this.touch();
    }
  }

  touch () {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this._expire(), this.expire);
  }

  send (message) {
    this.touch();
    this.socket.send(message);
  }

  close () {
    this.socket.close();
  }

  on (trigger, callback) {
    if (trigger === 'expire') {
      this.onExpire = callback;
    } else {
      this.socket.on(trigger, callback);
    }
  }

  _expire () {
    this.expired = true;
    this.socket.close();
    this.onExpire();
  }
}

module.exports = Socket;
