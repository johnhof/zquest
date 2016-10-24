'use strict';

const ZMQ = require('zmq');
const _ = require('lodash');
const UUID = require('node-uuid');

const DEFAULTS = require('./defaults.json');
const Pool = require('./pool');

const checkpoint = require('./helpers/checkpoint');
const toss = require('./helpers/toss');
const parse = require('./helpers/parse');


class Client {
  constructor (opts) {
    this.default = _.defaultsDeep(opts || {}, DEFAULTS.request);
    this.default.pool = _.defaultsDeep(this.default.pool || {} , DEFAULTS.pool);
    this.connections = {};
    this.pending = {};
  }

  defaults (config) {
    this.default = _.defaultsDeep(config || {}, this.default);
  }

  request (config) {
    return new Promise((resolve, reject) => {
      config = _.defaults(config || {}, this.default);
      let message
      if (_.isUndefined(message)) message = config.message;
      if (_.isUndefined(message)) message = config.body;
      if (_.isUndefined(message)) message = config.data;

      checkpoint(_.isString(config.host), 'host is required')
        .and(_.isString(config.port) || _.isNumber(config.port), 'port is required')
        .and(!_.isUndefined(message), '[data], [message], or [body] is must be set');

      this._acquire(config.host, config.port)
        .then((socket) => this._request(socket, message, config.timeout))
        .then(resolve)
        .catch(reject);
    });
  }

  _acquire (host, port) {
    return new Promise((resolve, reject) => {
      let key = host + ':' + port;
      if (!this.connections[key]) {
        let pool = new Pool(host, port, this.default.pool);
        this.connections[key] = pool;
      }

      this.connections[key].acquire()
        .then((socket) => {
          socket.key = key;
          socket.socket.identity = 'client' + process.pid;
          socket.socket.on('message', (data) => {
            this.connections[key].release(socket);
            this._resolve(data);
          });

          resolve(socket);
        })
        .catch(reject);
    });
  }

  _request (socket, data, timeout) {
    return new Promise((resolve, reject) => {
      let reqId = UUID.v4();
      if (_.isString(data) || _.isNumber(data)) {
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
          delete this.pending[reqId];
          this.connections[socket.key].release(socket);
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
