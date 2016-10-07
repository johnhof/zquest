'use strict';

const mocha = require('mocha');
const expect = require('chai').expect;
const ZMQ = require('zmq');
const _ = require('lodash');

const zquest = require('../');
const Client = require('../lib/client');
const Pool = require('../lib/pool');
const wait = require('../lib/helpers/wait');
const DEFAULTS = require('../lib/defaults');

// Rstore defaults
let restoreDefaults = function() {
  // reset request pools
  let config = _.clone(DEFAULTS.request);
  config.pool = _.clone(DEFAULTS.pool);
  zquest.defaults(config);
  _.each(zquest.client.connections, (conn, key) => {
    conn.close();
    delete zquest.client.connections[key];
  });

  // empty queue
  // let socket = ZMQ.socket('rep');
  // socket.bindSync(`tcp://127.0.0.1:5555`);
  // socket.close();
}
beforeEach(restoreDefaults);
afterEach(restoreDefaults);

describe('Request', () => {
  describe('exports', () => {
    it('should have a base level request', function () {
      expect(zquest).to.be.a('function');
      expect(zquest.defaults).to.be.a('function');
      expect(zquest.client).to.be.an.instanceof(Client);
    });

    it('should have parsing utilites', function () {
      expect(zquest.parse).to.be.a('function');
      expect(zquest.parse.message).to.be.a('function');
      expect(zquest.parse.messageId).to.be.a('function');
    });

    it('should have the ability to get a new request object', function () {
      expect(zquest.new).to.be.a('function');
      expect(zquest.new()).to.be.an.instanceof(Client);
    });
  });

  describe('configuraition',function () {
    it('should allow default overrides', function () {
      let override = { host: 'localhost', pool: { min: 5 } };
      let expected = _.defaultsDeep(override, zquest.client.default);
      zquest.defaults(override);
      expect(zquest.client.default).to.deep.equal(expected);
    });
  });

  describe('requests', function () {
    it('should allow requests to a socket', function* () {
      let socket = ZMQ.socket('rep');
      let recieved = false;
      let message = 'test';
      let connection = `${DEFAULTS.request.host}:${DEFAULTS.request.port}`;
      socket.bindSync(`tcp://${connection}`);
      socket.on('message', (msg) => {
        msg = zquest.parse(msg);
        expect(msg.data).to.equal(message);
        recieved = true;
        socket.send(msg._request_id + ':' + msg.data);
      });
      let configReset = DEFAULTS.request;
      configReset.pool = DEFAULTS.pool;
      zquest.defaults(configReset);
      let response = yield zquest({ message: message });
      expect(recieved).to.be.true;
      expect(response).to.equal(message);
      let pool = zquest.client.connections[connection];
      expect(pool).to.not.be.undefined;
      expect(Object.keys(pool.sockets.free).length).to.equal(2);
      socket.close();
    });

    it('should scale sockets as requests are made', function* () {
      let recieved = false;
      let connection = `${DEFAULTS.request.host}:${DEFAULTS.request.port}`;
      for (let i = 10; i > 0; i--) zquest({ message: 'test' });
      let pool = zquest.client.connections[connection];
      expect(pool).to.not.be.undefined;
      expect(Object.keys(pool.sockets.locked).length).to.equal(10);
    });

    it('should throw an error if a socket reachs max and another is requested', function *() {
      let recieved = false;
      let connection = `${DEFAULTS.request.host}:${DEFAULTS.request.port}`;
      zquest.defaults({ pool: { max: 5, acquire_retry: 10 }});
      for (let i = 5; i > 0; i--) {
        zquest({ message: 'test' });
      }
      let error = false;
      yield (new Promise((resolve) => {
        zquest({ message: 'testing' })
          .then(() => {
            resolve();
          })
          .catch((e) => {
            error = e;
            resolve();
          });
      }));
      expect(error.message).to.equal('Failed to acquire socket');
      zquest.client.connections[connection].close();
    });

    it('should expire and clean old sockets', function* () {
      let recieved = false;
      let connection = `${DEFAULTS.request.host}:${DEFAULTS.request.port}`;
      zquest.defaults({ pool: { socket_expire: 10 } });
      for (let i = 10; i > 0; i--) zquest({ message: 'test' });
      let pool = zquest.client.connections[connection];
      yield wait(100);
      expect(pool).to.not.be.undefined;
      expect(Object.keys(pool.sockets.free).length).to.equal(DEFAULTS.pool.min);
      expect(Object.keys(pool.sockets.locked).length).to.equal(0);
    });

    it('should allow for concurrent requests', function (done) {
      let socket = ZMQ.socket('rep');
      let connection = `${DEFAULTS.request.host}:${DEFAULTS.request.port}`;
      let expectNum = 100;
      let actualNum = 0;
      socket.bindSync(`tcp://${connection}`);
      socket.on('message', (msg) => {
        msg = zquest.parse(msg);
        console.log(msg);
        socket.send(msg);
      });

      // zquest.defaults();
      for (let i = expectNum; i  > 0; i--) {
        zquest({
          message: i
        }).then((data) => {
          console.log(data);
          console.log(expectNum, actualNum)
          actualNum++;
          if (expectNum === actualNum) {
            done();
            socket.close();
          }
        }).catch((e) => {
          actualNum++;
          if (expectNum === actualNum) {
            done();
            socket.close();
          }
          expect(e).to.be.undefined
        });
      }

      let pool = zquest.client.connections[connection];
      expect(Object.keys(pool.sockets.locked).length).to.equal(100);
    })
  });
});
