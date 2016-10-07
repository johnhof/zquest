'use strict';

const mocha = require('mocha');
const expect = require('chai').expect;

const Socket = require('../lib/socket');
const DEFAULTS = require('../lib/defaults').pool;

const URL = 'tcp://127.0.0.1:5555';

describe('Socket - wrapper class', () => {
  it('should initialize properly', function () {
    let socket = new Socket(URL);
    expect(socket.url).to.equal(URL);
    expect(socket.expired).to.be.false;
    expect(socket.expire).to.equal(DEFAULTS.socket_expire);
    expect(socket.touch).to.be.a('function');
    expect(socket.send).to.be.a('function');
    expect(socket.close).to.be.a('function');
    expect(socket.on).to.be.a('function');
    expect(socket._expire).to.be.a('function');
    socket.close();
  });

  it('should timeout and close', function (done) {
    let socket = new Socket(URL, { expire: 10 });
    let closed = false;
    socket.on('expire', () => {
      expect(() => socket.close()).to.throw(/socket is closed/i);
      expect(socket.expired).to.be.true;
      done();
    });
  });

  it('should allow timeout removal', function () {
    let socket = new Socket(URL, { expire: false });
    expect(socket.expire).to.be.false;
    expect(socket.timeout).to.be.undefined;
    socket.close();
  });
});
