'use strict';

const mocha = require('co-mocha');
const expect = require('chai').expect;

const wait = require('../lib/helpers/wait');
const Pool = require('../lib/pool');
const DEFAULTS = require('../lib/defaults').pool;

const HOST = '127.0.0.1';
const PORT = 5555;

describe('Pool - socket pool class', () => {
  it('should initialize properly', function () {
    let pool = new Pool(HOST, PORT);
    expect(pool.config).to.be.an('object');
    expect(pool.host).to.be.equal(HOST);
    expect(pool.port).to.equal(PORT);
    expect(pool.sockets.free).to.be.an('object');
    expect(pool.sockets.locked).to.be.an('object');
    expect(Object.keys(pool.sockets.free).length).to.equal(DEFAULTS.min);
    pool.close();
  });

  it('should close sockets when prompted', function () {
    let pool = new Pool(HOST, PORT, { min: 5 });
    expect(Object.keys(pool.sockets.free).length).to.equal(5);
    pool.close();
    expect(Object.keys(pool.sockets.free).length).to.equal(0);
  });

  it('should scale number of sockets', function *() {
    let pool = new Pool(HOST, PORT, { min: 1, socket_expire: 10000 });
    let acquired = [];
    expect(Object.keys(pool.sockets.free).length).to.equal(1);
    expect(Object.keys(pool.sockets.locked).length).to.equal(0);
    for (let i = 100; i > 0; i--) {
      let socket = yield pool.acquire();
      expect(Object.keys(pool.sockets.locked).length).to.equal((100-i)+1);
      acquired.push(socket);
    }

    for (let i = acquired.length-1; i >= 0; i--) {
      pool.release(acquired[i]);
      expect(Object.keys(pool.sockets.locked).length).to.equal(i);
      expect(Object.keys(pool.sockets.free).length).to.equal(acquired.length - i);
    }
    pool.close();
  });

  it('should support socket timeout and autoremoval', function *() {
    let pool = new Pool(HOST, PORT, { socket_expire: 10 });
    let acquired = [];
    expect(Object.keys(pool.sockets.free).length).to.equal(2);
    expect(Object.keys(pool.sockets.locked).length).to.equal(0);
    for (let i = 10; i > 0; i--) {
      let socket = yield pool.acquire();
      expect(Object.keys(pool.sockets.locked).length).to.equal((10-i)+1);
    }
    yield wait(100);
    expect(Object.keys(pool.sockets.free).length).to.equal(2);
    expect(Object.keys(pool.sockets.locked).length).to.equal(0);
  });

  it('should utilize existing sockects when available', function *() {
    let pool = new Pool(HOST, PORT);
    let acquired = [];
    expect(Object.keys(pool.sockets.free).length).to.equal(2);
    expect(Object.keys(pool.sockets.locked).length).to.equal(0);
    for (let i = 10; i > 0; i--) {
      let socket = yield pool.acquire();
      expect(Object.keys(pool.sockets.locked).length).to.equal((10-i)+1);
      acquired.push(socket);
    }
    expect(Object.keys(pool.sockets.locked).length).to.equal(10);
    for (let i = 5; i > 0; i--) {
      pool.release(acquired[i]);
    }
    expect(Object.keys(pool.sockets.locked).length).to.equal(5);
    expect(Object.keys(pool.sockets.free).length).to.equal(5);
    for (let i = 3; i > 0; i--) {
      let socket = yield pool.acquire();
    }
    expect(Object.keys(pool.sockets.locked).length).to.equal(8);
    expect(Object.keys(pool.sockets.free).length).to.equal(2);
  });
});
