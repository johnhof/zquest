'use strict';

module.exports = (ms) => new Promise((r) => { setTimeout(r, ms); });
