'use strict';

const _ = require('lodash');
const Client = require('./lib/client');
const parse = require('./lib/helpers/parse');

let client = new Client();

// Generic request
module.exports = (c) => client.request(c);
module.exports.defaults = (c) => client.defaults(c);
module.exports.client = client;

// New request object
module.exports.new = (opts) => new Client(opts)

// helpers
module.exports.parse = parse.message;
_.extend(module.exports.parse, parse);
