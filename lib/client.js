'use strict';

'use strict';

const ZMQ = require('zmq');
const _ = require('lodash');
const UUID = require('node-uuid');

const DEFAULTS = require('./defaults.json');

const checkpoint = require('./helpers/checkpoint');
const toss = require('./helpers/toss');
const parse = require('./helpers/parse');


class Client {
  constructor (opts) {
    this.default = _.defaultsDeep(opts || {}, DEFAULTS.request);
    this.sockets = {};
    this.pending = {};
  }

  defaults (config) {
    this.default = _.defaults(config || {}, this.default);
  }

  request (config) {
    return new Promise((resolve, reject) => {
      config = _.defaults(config || {}, this.default);
      let message = config.data || config.message || config.body
      checkpoint(_.isString(config.host), 'host is required')
        .and(_.isString(config.port) || _.isNumber(config.port), 'port is required')
        .and(message, '[data], [message], or [body] is must be set');

      let url = `tcp://${config.host}:${config.port}`;
      let socket = this._acquire(url);
      this._request(socket, message, config.timeout)
        .then(resolve)
        .catch(reject);
    });
  }

  _acquire (url) {
    if (!this.sockets[url]) {
      let socket = ZMQ.socket('req');
      socket.connect(url);
      socket.identity = 'client' + process.pid;
      this.sockets[url] = socket;
      this.sockets[url].on('message', (data) => this._resolve(data));
    }

    return this.sockets[url];
  }

  _request (socket, data, timeout) {
    return new Promise((resolve, reject) => {
      let reqId = UUID.v4();
      if (_.isString(data)) {
        data = `${reqId}:${data}`;
      } else {
        data._request_id = reqId;
        data = JSON.stringify(data)
      }
      socket.send(data);
      this.pending[reqId] = {
        resolve: resolve,
        reject: reject,
        timeout: setTimeout(() => {
          delete this.pending[reqId]
          reject(new Error('request timeout'));
        }, timeout)
      };
    });
  }

  _resolve (message) {
    let parsed = parse.message(message);
    let id = parsed._request_id;
    let data = parsed.data;
    checkpoint(id, 'Failed to parse request ID from response')
      .and(this.pending[id], 'Failed to match response to pending request');

    clearTimeout(this.pending[id].timeout);
    this.pending[id].resolve(data);
  }
}

module.exports = Client;
