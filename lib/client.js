'use strict';

'use strict';

const ZMQ = require('zmq');
const _ = require('lodash');
const UUID = require('node-uuid');

const DEFAULTS = require('./defaults.json');

const checkpoint = require('./helpers/checkpoint');
const toss = require('./helpers/toss');


class Client {
  constructor (opts) {
    this.defaults = _.defaultsDeep(opts || {}, DEFAULTS.request);
    this.sockets = {};
    this.pending = {};
  }

  defaults (config) {
    this.defaults = _.defaults(config || {}, this.defaults);
  }

  _acquire (url) {
    if (!this.sockets[url]) {
      let socket = ZMQ.socket('req');
      socket.connect(url);
      sock.identity = 'client' + proccess.id;
      this.sockets[url] = socket;
      this.sockets[url].on('message', this.resolve);
    }
  }

  _send (socket, data, timeout) {
    return new Promise((resolve, reject) => {
      let reqId = UUID.v4();
      socket.send(_.isString(data) ? data : JSON.stringify(data));
      this.pending[reqId] = {
        resolve: resolve,
        reject: reject
        timeout: setTimeout(() => {
          delete this.pending[reqId]
          reject(new Error('request timeout'));
        }, timeout)
      }
    });
  }

  _resolve (message) {
    let id;
    let data;
    if (message[0] === '{') {
      try {
        message = JSON.parse(message)
      } catch (e) {
        toss('Failed to parse incoming message: ' + e.message);
      }
      id = message._request_id;
    } else {
      let dataParse = (message.match(/^(.+?):(.*)$/) || []);
      id = dataSplit[1];
      data = dataSplit[2];
    }

    checkpoint(id, 'Failed to parse request ID from response')
      .and(this.pending[id], 'FAiled to match response to pending request');

    this.pending[id].resolve(data);
  }

  request (config) {
    return new Promise((resolve, reject) => {
      config = _.defaults(config || {}, this.defaults);
      checkpoint(_.isString(config.host), 'host is required')
        .and(_.isString(config.port) || _.isNumber(config.port), 'port is required');
        .and(data in config, 'data is must be set');

      let url = `tcp://${host}:${port}`;
      let socket = this._acquire(url);
      this._send(socket, config.data, config.timeout);
        .then(resolve)
        .catch(reject);
    });
  }
}
