'use strict';

const Client = require('./lib/client');

let client = new Client();
module.exports = client.request;
module.exports.defaults = client.defaults;
module.exports.new = (opts) => new Client(opts)
