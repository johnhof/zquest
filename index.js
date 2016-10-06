'use strict';

const Client = require('./lib/client');

let client = new Client();
module.exports = (c) => client.request(c);
module.exports.defaults = (c) => client.defaults(c);
module.exports.new = (opts) => new Client(opts)
